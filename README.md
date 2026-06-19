# BrainMaster

**BrainMaster** é um sistema web que transforma múltiplos PDFs em mapas mentais completos, personalizáveis e exportáveis. Interface moderna, fluida e minimalista com tema escuro por padrão.

## Funcionalidades

- **Upload múltiplo de PDFs** com drag-and-drop
- **Geração automática de mapa mental** via NLP (tokenização, stopwords, bigramas, detecção de títulos e hierarquia)
- **Customização visual** em tempo real:
  - Cor dos ramos
  - Cor do texto
  - Gradiente opcional
  - Densidade do mapa
  - Ícones (emojis) por tópico
  - Imagem de fundo (gradiente padrão ou upload customizado)
- **Deleção de nós** com modo dedicado
- **Botão Refazer** para regenerar o mapa
- **Download PNG** e **PDF** (alta resolução, 2x)
- **Zoom e pan** com mouse
- **Context menu** (botão direito) para deletar/expandir/recolher
- **Animações suaves** durante a geração (loader com steps)
- **Tema escuro/claro** alternável
- **Atalhos de teclado** (Ctrl+O, Ctrl+Enter, Ctrl+S, Esc)

## Stack

- **PDF.js** (Mozilla) — extração de texto dos PDFs
- **D3.js** — renderização customizada do mapa mental em SVG
- **html2canvas** — geração de PNG
- **jsPDF** — geração de PDF
- **Inter** + **Space Grotesk** + **JetBrains Mono** — tipografia (Google Fonts)
- HTML5 + CSS3 + JavaScript (vanilla, sem build step)

## Estrutura

```
BrainMaster/
├── index.html              # Markup principal
├── styles.css              # Design system + tema
├── script.js               # Toda a lógica (IIFE)
├── assets/
│   ├── logo.svg            # Logo do app
│   └── backgrounds/
│       └── background.svg  # Imagem de fundo (substitua pelo seu arquivo "background")
└── .gitignore
```

## Como usar

1. Abra `index.html` em um servidor local (não funciona via `file://`):
   ```bash
   python -m http.server 8000
   # ou
   npx serve
   ```
2. Acesse `http://localhost:8000`
3. Arraste PDFs para a área de upload
4. Clique em **Gerar mapa mental**
5. Personalize cores, fundo e densidade no painel lateral
6. Clique em nós para deletar ou clique com botão direito para mais opções
7. Use **Refazer** para regenerar, ou **PNG/PDF** para exportar

## Background

A imagem de fundo padrão é um SVG placeholder em `assets/backgrounds/background.svg`. **Substitua esse arquivo** pelo seu `background.jpg` (ou `.png`) com o mesmo nome para usar sua própria imagem de fundo. O CSS e JS já estão configurados para carregá-lo automaticamente.

## Customização

- **Cores dos ramos** — color picker + gradiente opcional (gera paleta automaticamente)
- **Densidade** — slider de 1 (curto) a 5 (detalhado)
- **Ícones** — habilita/desabilita emojis por nó (baseado em palavras-chave do nome)

## Atalhos

- `Ctrl/Cmd + O` — abrir arquivo
- `Ctrl/Cmd + Enter` — gerar mapa
- `Ctrl/Cmd + S` — exportar PNG
- `Esc` — fechar menus / sair do modo delete
- `Scroll` — zoom
- `Drag` — pan
- `Click direito em nó` — context menu
