package main

import (
	"bytes"
	"html/template"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

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
	"templates/github-download-stats.html",
}

func main() {
	if err := os.MkdirAll(outDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

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

	for _, dir := range []string{"js", "css", "fonts"} {
		if err := copyDir(dir, filepath.Join(outDir, dir)); err != nil {
			log.Fatalf("Failed to copy %s directory: %v", dir, err)
		}
		log.Printf("Copied %s/", dir)
	}

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
