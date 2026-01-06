package main

import (
	"bytes"
	"flag"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/css"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

const outDir = "build"

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
}

const siteURL = "https://agejevasv.github.io"

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
		Target:            api.ES2022,
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
		Target:            api.ES2022,
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
	serve := flag.Bool("s", false, "Start a local server after building")
	port := flag.String("p", "8080", "Port for the local server")
	help := flag.Bool("h", false, "Print help")
	flag.Parse()

	if *help {
		flag.Usage()
		return
	}

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

	if err := bundleESM("js/index.js", filepath.Join(outDir, "js/bundle.js")); err != nil {
		log.Fatalf("Failed to bundle main JS: %v", err)
	}
	log.Printf("Bundled js/*.js → js/bundle.js")

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

	if err := copyDir("music", filepath.Join(outDir, "music")); err != nil {
		log.Fatalf("Failed to copy music directory: %v", err)
	}
	log.Printf("Copied music/")

	if err := buildGexProject(); err != nil {
		log.Fatalf("Failed to build gex project: %v", err)
	}

	generateVersionFile()
	generateSitemap()

	log.Println("Build complete!")

	if *serve {
		addr := "0.0.0.0:" + *port
		log.Printf("Starting server at http://%s", addr)
		log.Fatal(http.ListenAndServe(addr, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			// Serve /foo as /foo.html
			if path != "/" && filepath.Ext(path) == "" {
				htmlPath := filepath.Join(outDir, path+".html")
				if _, err := os.Stat(htmlPath); err == nil {
					http.ServeFile(w, r, htmlPath)
					return
				}
			}
			http.FileServer(http.Dir(outDir)).ServeHTTP(w, r)
		})))
	}
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

func generateSitemap() {
	var sitemap bytes.Buffer
	for _, p := range pages {
		url := siteURL + "/"
		if p.Output != "index.html" {
			url += strings.TrimSuffix(p.Output, ".html")
		}
		sitemap.WriteString(url + "\n")
	}

	// Add additional pages
	sitemap.WriteString(siteURL + "/github-download-stats\n")
	sitemap.WriteString(siteURL + "/gex\n")

	sitemapPath := filepath.Join(outDir, "sitemap.txt")
	if err := os.WriteFile(sitemapPath, sitemap.Bytes(), 0644); err != nil {
		log.Printf("Warning: Failed to write sitemap.txt: %v", err)
		return
	}

	log.Printf("Generated %s", sitemapPath)
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

func gitClone(repo, dest string) error {
	cmd := exec.Command("git", "clone", "--depth", "1", repo, dest)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func buildGexProject() error {
	gexSrcDir := filepath.Join(os.TempDir(), "gex-build")
	gexOutDir := filepath.Join(outDir, "gex")
	analyticsTag := `<script data-goatcounter="https://va42.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>`

	// Clone gex repository
	os.RemoveAll(gexSrcDir)
	if err := gitClone("https://github.com/agejevasv/gex.git", gexSrcDir); err != nil {
		return fmt.Errorf("failed to clone gex repository: %w", err)
	}
	defer os.RemoveAll(gexSrcDir)

	os.RemoveAll(gexOutDir)

	if err := os.MkdirAll(filepath.Join(gexOutDir, "css"), 0755); err != nil {
		return fmt.Errorf("failed to create gex/css directory: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(gexOutDir, "js"), 0755); err != nil {
		return fmt.Errorf("failed to create gex/js directory: %w", err)
	}

	cssContent, err := os.ReadFile(filepath.Join(gexSrcDir, "css/style.css"))
	if err != nil {
		return fmt.Errorf("failed to read gex CSS: %w", err)
	}
	minifiedCSS, err := minifyCSS(string(cssContent))
	if err != nil {
		return fmt.Errorf("failed to minify gex CSS: %w", err)
	}
	if err := os.WriteFile(filepath.Join(gexOutDir, "css/style.css"), []byte(minifiedCSS), 0644); err != nil {
		return fmt.Errorf("failed to write minified gex CSS: %w", err)
	}
	log.Printf("Minified %s/css/style.css: %d → %d bytes", gexSrcDir, len(cssContent), len(minifiedCSS))

	if err := bundleESM(filepath.Join(gexSrcDir, "js/index.js"), filepath.Join(gexOutDir, "js/index.js")); err != nil {
		return fmt.Errorf("failed to bundle gex JS: %w", err)
	}

	jsContent, err := os.ReadFile(filepath.Join(gexOutDir, "js/index.js"))
	if err != nil {
		return fmt.Errorf("failed to read bundled JS: %w", err)
	}
	jsWithConfig := strings.Replace(string(jsContent), "<YOUR_API_PROXY>", "https://gex.va42.workers.dev", 1)
	if err := os.WriteFile(filepath.Join(gexOutDir, "js/index.js"), []byte(jsWithConfig), 0644); err != nil {
		return fmt.Errorf("failed to write JS with config: %w", err)
	}
	log.Printf("Bundled %s/js/*.js → gex/js/index.js", gexSrcDir)

	htmlContent, err := os.ReadFile(filepath.Join(gexSrcDir, "index.html"))
	if err != nil {
		return fmt.Errorf("failed to read gex HTML: %w", err)
	}
	htmlWithAnalytics := strings.Replace(string(htmlContent), "<!-- ANALYTICS -->", analyticsTag, 1)
	if err := os.WriteFile(filepath.Join(gexOutDir, "index.html"), []byte(htmlWithAnalytics), 0644); err != nil {
		return fmt.Errorf("failed to write gex HTML: %w", err)
	}
	log.Printf("Copied %s/index.html → gex/index.html (with analytics)", gexSrcDir)

	return nil
}
