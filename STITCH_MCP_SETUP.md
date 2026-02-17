# Stitch MCP — Configuração e Uso

## Projeto e tela desejados
- **Project ID:** 8208655433373252482
- **Screen:** Enhanced Streaming Home V1
- **Screen ID:** f1716ad9ceb745c18a0f6a13ce3d5367

---

## 1. Configurar Stitch MCP no Cursor

### Passo A: Google Cloud
```powershell
gcloud auth login
gcloud config set project SEU_PROJECT_ID
gcloud auth application-default set-quota-project SEU_PROJECT_ID
gcloud beta services mcp enable stitch.googleapis.com
gcloud auth application-default login
```

### Passo B: Adicionar ao Cursor
Em **Cursor** → **Settings** → **MCP** → **Add New Server**:

```json
{
  "stitch": {
    "command": "cmd",
    "args": ["/c", "npx", "-y", "stitch-mcp"],
    "env": {
      "GOOGLE_CLOUD_PROJECT": "SEU_PROJECT_ID"
    }
  }
}
```

### Passo C: Reiniciar o Cursor

---

## 2. Após configurar, peça ao assistente

- "Busque o código da tela Enhanced Streaming Home V1 do projeto Stitch 8208655433373252482"
- "Baixe a imagem da screen f1716ad9ceb745c18a0f6a13ce3d5367"

---

## Referência
- [stitch-mcp no npm](https://www.npmjs.com/package/stitch-mcp)
- [Stitch with Google](https://stitch.withgoogle.com/)
