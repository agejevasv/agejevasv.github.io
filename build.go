package main

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/css"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

const outDir = "docs"

type Page struct {
	Title       string
	Description string
	Active      string
	Content     template.HTML
	InlineCSS   template.CSS
}

var pages = []struct {
	Source      string
	Output      string
	Title       string
	Description string
	Active      string
}{
	{"content/index.md", "index.html", "Software Engineer", "Homepage of Viktoras Agejevas", "about"},
	{"content/projects.md", "projects.html", "Projects", "Open source projects and tools by Viktoras Agejevas.", "projects"},
	{"content/music.md", "music.html", "Music", "Some of music created by Viktoras Agejevas.", "music"},
	{"content/writing.md", "writing.html", "Writing", "Aphorisms by Viktoras Agejevas.", "writing"},
}

var staticFiles = []string{
	"static/github-download-stats.html",
	"static/google2fe609a678bc07c0.html",
	"static/sitemap.txt",
}

func minifyCSS(input string) (string, error) {
	m := minify.New()
	m.AddFunc("text/css", css.Minify)
	return m.String("text/css", input)
}

func bundleJS(entryPoints []string, outfile string) error {
	var combined bytes.Buffer
	for _, entry := range entryPoints {
		content, err := os.ReadFile(entry)
		if err != nil {
			return fmt.Errorf("failed to read %s: %w", entry, err)
		}
		combined.Write(content)
		combined.WriteString("\n")
	}

	result := api.Transform(combined.String(), api.TransformOptions{
		MinifyWhitespace:  true,
		MinifyIdentifiers: true,
		MinifySyntax:      true,
		Target:            api.ES2020,
	})

	if len(result.Errors) > 0 {
		for _, msg := range result.Errors {
			log.Printf("esbuild error: %s", msg.Text)
		}
		return fmt.Errorf("esbuild: %s", result.Errors[0].Text)
	}

	return os.WriteFile(outfile, result.Code, 0644)
}

func bundleESM(entryPoint string, outfile string) error {
	result := api.Build(api.BuildOptions{
		EntryPoints:       []string{entryPoint},
		Bundle:            true,
		MinifyWhitespace:  true,
		MinifyIdentifiers: true,
		MinifySyntax:      true,
		Outfile:           outfile,
		Write:             true,
		Format:            api.FormatESModule,
		Target:            api.ES2020,
	})

	if len(result.Errors) > 0 {
		for _, msg := range result.Errors {
			log.Printf("esbuild error: %s", msg.Text)
		}
		return fmt.Errorf("esbuild: %s", result.Errors[0].Text)
	}
	return nil
}

func main() {
	if err := os.MkdirAll(outDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	cssContent, err := os.ReadFile("css/styles.css")
	if err != nil {
		log.Fatalf("Failed to read CSS: %v", err)
	}
	minifiedCSS, err := minifyCSS(string(cssContent))
	if err != nil {
		log.Fatalf("Failed to minify CSS: %v", err)
	}
	log.Printf("Minified CSS: %d → %d bytes (%.0f%% reduction)",
		len(cssContent), len(minifiedCSS),
		(1-float64(len(minifiedCSS))/float64(len(cssContent)))*100)

	if err := os.MkdirAll(filepath.Join(outDir, "js"), 0755); err != nil {
		log.Fatalf("Failed to create js directory: %v", err)
	}

	if err := bundleJS([]string{"js/index.js", "js/animation.js"}, filepath.Join(outDir, "js/bundle.js")); err != nil {
		log.Fatalf("Failed to bundle main JS: %v", err)
	}
	log.Printf("Bundled js/index.js + js/animation.js → js/bundle.js")

	// ESM format required for dynamic import()
	if err := os.MkdirAll(filepath.Join(outDir, "js/pixijs"), 0755); err != nil {
		log.Fatalf("Failed to create js/pixijs directory: %v", err)
	}
	if err := bundleESM("js/pixijs/app.js", filepath.Join(outDir, "js/pixijs/app.js")); err != nil {
		log.Fatalf("Failed to bundle pixijs app: %v", err)
	}
	log.Printf("Bundled js/pixijs/*.js → js/pixijs/app.js")

	md := goldmark.New(
		goldmark.WithExtensions(extension.GFM),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html.WithHardWraps(),
			html.WithXHTML(),
			html.WithUnsafe(),
		),
	)

	tmpl, err := template.ParseFiles("templates/base.html")
	if err != nil {
		log.Fatalf("Failed to parse template: %v", err)
	}

	for _, p := range pages {
		content, err := os.ReadFile(p.Source)
		if err != nil {
			log.Fatalf("Failed to read %s: %v", p.Source, err)
		}

		var htmlContent bytes.Buffer

		if p.Active == "about" {
			htmlContent.Write(content)
		} else {
			if err := md.Convert(content, &htmlContent); err != nil {
				log.Fatalf("Failed to convert markdown %s: %v", p.Source, err)
			}
		}

		page := Page{
			Title:       p.Title,
			Description: p.Description,
			Active:      p.Active,
			Content:     template.HTML(htmlContent.String()),
			InlineCSS:   template.CSS(minifiedCSS),
		}

		outPath := filepath.Join(outDir, p.Output)
		outFile, err := os.Create(outPath)
		if err != nil {
			log.Fatalf("Failed to create %s: %v", outPath, err)
		}

		if err := tmpl.Execute(outFile, page); err != nil {
			outFile.Close()
			log.Fatalf("Failed to execute template for %s: %v", outPath, err)
		}

		outFile.Close()
		log.Printf("Generated %s", outPath)
	}

	for _, src := range staticFiles {
		dst := filepath.Join(outDir, filepath.Base(src))
		if err := copyFile(src, dst); err != nil {
			log.Fatalf("Failed to copy %s: %v", src, err)
		}
		log.Printf("Copied %s", dst)
	}

	if err := copyDir("fonts", filepath.Join(outDir, "fonts")); err != nil {
		log.Fatalf("Failed to copy fonts directory: %v", err)
	}
	log.Printf("Copied fonts/")

	generateVersionFile()

	log.Println("Build complete!")
}

func generateVersionFile() {
	versionPath := filepath.Join(outDir, "version.txt")
	date := time.Now().UTC().Format("2006-01-02 15:04:05 UTC")

	if err := os.WriteFile(versionPath, []byte(date+"\n"), 0644); err != nil {
		log.Printf("Warning: Failed to write version.txt: %v", err)
		return
	}

	log.Printf("Generated %s", versionPath)
}

func copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	return err
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(dstPath, 0755)
		}

		return copyFile(path, dstPath)
	})
}
