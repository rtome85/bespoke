# Plano de Implementação: Export PDF

## Estado Atual

✅ Rollback completo - código está no estado original antes das alterações PDF

---

## Análise do Problema

### Tentativas Anteriores Falhadas:

1. **jsPDF + html2canvas**

   - ❌ Problema: Conversão de HTML para imagem perde formatação
   - ❌ Links não ficam clicáveis
   - ❌ Paginação automática corta texto a meio

2. **@speajus/markdown-to-pdf**

   - ❌ Incompatível com browser extension (requer Node.js/pdfkit)
   - ❌ Erro de build: "Failed to resolve 'pdfkit'"

3. **html-to-image + jsPDF**
   - ❌ Mesmos problemas do html2canvas
   - ❌ Margens e paddings não respeitados
   - ❌ Texto cortado entre páginas

### Lições Aprendidas:

- Renderizar HTML como imagem e cortar NÃO FUNCIONA bem
- Precisamos de bibliotecas que funcionem no browser
- Markdown-to-PDF direto é melhor que HTML-to-imagem-to-PDF

---

## Solução Recomendada

### Abordagem: Markdown → PDF direto com PDFKit compatível

**Opção A: react-pdf (Renderer React)**

- ✅ Funciona no browser
- ✅ JSX-based, fácil de estilizar
- ✅ Suporte a multi-páginas nativo
- ✅ Links clicáveis
- ❌ Requer reescrever markup em JSX

**Opção B: pdfmake**

- ✅ Funciona no browser
- ✅ Define documentos como objetos JavaScript
- ✅ Suporte a tabelas, listas, estilos
- ✅ Paginação automática inteligente
- ❌ Curva de aprendizado

**Opção C: @react-pdf/renderer** (RECOMENDADO)

- ✅ Específico para React
- ✅ Componentes familiares (View, Text, Link, Page)
- ✅ Estilos CSS-like
- ✅ Suporte a fontes personalizadas
- ✅ Funciona em browser extensions

---

## Plano de Implementação Detalhado

### Fase 1: Setup (30 min)

1. Instalar `@react-pdf/renderer`
2. Configurar alias no parcel (se necessário)
3. Criar estrutura de ficheiros
4. Verificar build

### Fase 2: Componentes PDF (1h)

1. Criar `ResumePDF.tsx` - Componente de renderização do CV
2. Criar `CoverLetterPDF.tsx` - Componente de renderização da carta
3. Estilos ATS-friendly baseados no tema Typora
4. Parser de markdown para componentes React-PDF

### Fase 3: Integração (30 min)

1. Atualizar `dialog.tsx` com botões PDF
2. Criar função `downloadPdf()` que usa react-pdf
3. Testar downloads

### Fase 4: Testes (30 min)

1. Testar com CV de exemplo
2. Verificar paginação
3. Verificar margens
4. Verificar links clicáveis

---

## Especificação Técnica

### Estrutura de Ficheiros

```
src/
├── components/
│   └── pdf/
│       ├── ResumePDF.tsx
│       ├── CoverLetterPDF.tsx
│       ├── PDFStyles.ts
│       └── MarkdownParser.ts
├── utils/
│   └── pdfGenerator.ts (novo)
```

### Tema ATS (baseado no Typora)

```typescript
const ATS_THEME = {
  fonts: {
    body: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique"
  },
  sizes: {
    h1: 16, // Nome
    h2: 12, // Secções
    h3: 11, // Títulos
    body: 11 // Texto normal
  },
  margins: {
    top: 40, // ~0.55in em pontos
    right: 55, // ~0.75in
    bottom: 40,
    left: 55
  }
}
```

### Exemplo de Componente

```tsx
import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11
  },
  h1: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    borderBottom: "2pt solid black",
    marginBottom: 4
  }
})

export const ResumePDF = ({ content }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Conteúdo parseado */}
    </Page>
  </Document>
)
```

---

## Checklist Antes de Começar

- [ ] Utilizador aprova este plano
- [ ] Confirmar tema Typora exacto
- [ ] Definir se queremos preview antes de download
- [ ] Confirmar requisitos de acessibilidade/ATS

---

## Perguntas ao Utilizador

1. **Prioridade:** Queres que eu implemente já ou preferes ver outras opções primeiro?

2. **Formato:** Prefers que os links apareçam como:

   - A) Apenas texto clicável (LinkedIn)
   - B) Texto + URL (LinkedIn - https://linkedin.com/in/...)
   - C) Apenas URL (https://linkedin.com/in/...)

3. **Preview:** Queres um botão "Preview PDF" antes de fazer download?

4. **Fontes:** O tema usa Calibri/Arial. Posso usar Helvetica (similar) ou precisas de carregar Calibri?

5. **Timeline:** Queres todas as features (Resume + Cover Letter) de uma vez ou começamos só com Resume?

---

## Estimativa de Tempo Total

- Setup: 30 min
- Componentes: 1h
- Integração: 30 min
- Testes: 30 min
- **Total: ~2.5 horas**

---

## Próximos Passos

Aguardar aprovação do utilizador antes de começar implementação.
