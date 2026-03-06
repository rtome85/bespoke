# JobTailor - Plano de Desenvolvimento de Features

**Data:** 2026-03-06  
**Versão:** 1.1  
**Estado:** Em Desenvolvimento - Fase 1 Ativa

---

## 📋 Índice

1. [Visão Geral do Produto](#visão-geral-do-produto)
2. [Análise da Arquitetura Atual](#análise-da-arquitetura-atual)
3. [Features Existentes](#features-existentes)
4. [Propostas de Novas Features](#propostas-de-novas-features)
5. [Roadmap de Implementação](#roadmap-de-implementação)

---

## Visão Geral do Produto

### O que é o JobTailor?

O JobTailor é uma extensão de browser (Chrome/Firefox) construída com o framework Plasmo que ajuda candidatos a emprego a:

- Gerar CVs e cartas de apresentação personalizadas usando IA
- Fazer tracking de candidaturas ao longo do pipeline
- Investigar empresas automaticamente
- Preparar-se para entrevistas técnicas

### Stack Tecnológica

| Componente | Tecnologia                   |
| ---------- | ---------------------------- |
| Framework  | Plasmo (browser extension)   |
| Frontend   | React 18.2.0 + TypeScript    |
| Styling    | Tailwind CSS 3.4.1           |
| Ícones     | Lucide React                 |
| Storage    | Chrome Extension Storage API |
| AI APIs    | Ollama API, Perplexity API   |
| Sync       | Google Drive API             |

---

## Análise da Arquitetura Atual

### Estrutura de Ficheiros

```
src/
├── api/
│   └── perplexityClient.ts      # Cliente Perplexity API
├── background/
│   └── messages/
│       └── generateDocuments.ts # Handler de geração de docs
├── components/
│   ├── ArrayInput.tsx
│   ├── CertificateEditor.tsx
│   ├── DatePicker.tsx
│   ├── Education.tsx
│   ├── ExperienceEditor.tsx
│   ├── LanguageEditor.tsx
│   ├── ModelSelector.tsx
│   ├── PersonalInfo.tsx
│   ├── PreparationPlanModal.tsx # Modal de planos de prep
│   ├── ProjectEditor.tsx
│   ├── PromptDialog.tsx         # Dialog de prompts
│   ├── SkillEditor.tsx
│   └── Tabs.tsx
├── tabs/
│   └── dialog.tsx               # UI principal da extensão
├── types/
│   ├── config.ts                # Tipos de configuração
│   └── userProfile.ts           # Tipos de perfil
├── utils/
│   ├── documentFormatter.ts     # Formatação de docs
│   └── googleDriveSync.ts       # Sync com Google Drive
├── options.tsx                  # Página de opções/settings
├── popup.tsx                    # Popup da extensão
└── style.css                    # Estilos globais
```

### Padrões de UI/UX Identificados

**Design System:**

- Paleta: Primary (Purple), Success (Emerald), Accent (Amber/Orange)
- Border Radius: `rounded-lg` (8px) inputs, `rounded-2xl` (16px) cards
- Sombras: `shadow-lg` para cards
- Tipografia: System font stack

**Componentes Reutilizáveis:**

- Modal dialogs (centrados, overlay escuro)
- Tabs horizontais
- Cards com padding consistente (p-6)
- Form inputs com focus:ring-purple-500
- Status badges coloridos

**Fluxos de Utilizador:**

1. Geração de documentos: Form → Loading → Success
2. Tracking: Lista → View/Edit → Save
3. Settings: Tabs verticais por categoria

---

## Features Existentes

### 1. Geração de Documentos (CV + Cover Letter)

**Capacidades:**

- Múltiplos modelos de IA (GPT-OSS 20B/120B, DeepSeek V3.1, MiniMax M2.5, GLM-5)
- Prompts customizáveis (system + user)
- Templates pré-definidos (Standard, Tech/Engineering, Creative/Portfolio)
- Fine-tuning de LLM (temperature, top_p, max_tokens)
- Análise de match (% de compatibilidade, strengths, weaknesses, improvements)

**Outputs:**

- Markdown formatado
- Download como ficheiro .md
- Match percentage visual

### 2. Job Application Tracking

**Pipeline Suportado:**

```
Saved → Applied → HR Interview → 1st Technical Interview →
2nd Technical Interview → Final Interview → Offer → Reject
```

**Dados Guardados:**

- Company, Job Title, Status, Date, Job URL
- Match Percentage
- Resume/Cover Letter content (opcional)
- Preparation Plan (para entrevistas)

**Operações:**

- CRUD completo
- View modal com detalhes
- Download de documentos guardados

### 3. Company Research (Perplexity)

**Dados Coletados:**

- Industry/Sector
- Company size
- Description
- Notable projects (até 6)
- Ratings: Glassdoor, Indeed, Teamlyzer

**Customização:**

- Prompt de research editável
- Enable/disable na tab Perplexity

### 4. Interview Preparation Plans

**Trigger:**

- Status muda para HR Interview, 1st Technical, ou 2nd Technical

**Conteúdo Gerado:**

1. Key Technologies & Skills
2. Technical Questions (8-12)
3. Coding Challenges (3-5)
4. Technical Deep Dive Topics (2-3)

**Customização:**

- Enable/disable na tab Perplexity
- Prompt personalizável

### 5. Profile Management

**Secções:**

- Personal Info (8 campos)
- Education (grau, instituição, datas, descrição)
- Certificates (nome, emissor, datas, URL)
- Skills (nome, anos de experiência, categoria)
- Work Experience (título, empresa, datas, achievements)
- Personal Projects (título, descrição, URLs)
- Languages (nome, nível)

### 6. Backup & Sync

**Métodos:**

- Google Drive Sync (automático, 2s debounce)
- Manual Export/Import (JSON)
- Chrome storage local

---

## Propostas de Novas Features

### 🎯 PRIORIDADE 1: Alto Impacto, Implementação Viável

#### 1.1 Export para PDF

**Descrição:** Converter documentos Markdown gerados para formato PDF

**Problema Resolvido:**

- 90% das empresas pedem CV em PDF, não Markdown
- Elimina necessidade de ferramentas externas

**Implementação Proposta:**

```typescript
// Bibliotecas: jsPDF + html2canvas ou react-pdf
// Novo botão: "Download as PDF"
// Templates de formatação pré-definidos
// Preview antes de download
```

**Status:** ✅ IMPLEMENTADO (2026-03-06)

**Esforço:** Médio  
**Impacto:** ⭐⭐⭐⭐⭐ Muito Alto

**Ficheiros Modificados:**

- ✅ `src/utils/pdfGenerator.ts` (novo) - Utilitário de geração de PDF com html2canvas + jsPDF
- ✅ `src/tabs/dialog.tsx` - Botões PDF adicionados em 3 locais:
  1. Tela de sucesso (Success Screen)
  2. Modal de detalhes da aplicação (Application Details)
  3. Tabela de aplicações (Actions column)
- ✅ `package.json` - Dependências jspdf e html2canvas adicionadas

**Funcionalidades Implementadas:**

- Conversão de Markdown para HTML formatado
- Geração de PDF multi-página (A4)
- Formatação preservada: headers, bold, italic, code blocks, listas, links
- Fallback para geração texto-base se html2canvas falhar
- UI consistente com design system existente (botões outline)

**Notas Técnicas:**

- Usa html2canvas para renderizar HTML como imagem
- jsPDF cria documento PDF com múltiplas páginas se necessário
- Container temporário criado e removido automaticamente
- Scale 2x para melhor qualidade de imagem

---

#### 1.2 LinkedIn Profile Import

**Descrição:** Importação automática do perfil LinkedIn

**Problema Resolvido:**

- Setup inicial reduzido de 30+ minutos para 2 cliques
- Elimina erros de digitação
- Dados sempre atualizados

**Implementação Proposta:**

```typescript
// Content script para linkedin.com/in/*
// Scraper de JSON-LD (LinkedIn expõe dados estruturados)
// Botão "Import from LinkedIn" no Personal Info
// Mapeamento automático de campos
```

**Esforço:** Médio  
**Impacto:** ⭐⭐⭐⭐⭐ Muito Alto

**Ficheiros a Criar/Modificar:**

- `src/contents/linkedin-profile.ts` (novo content script)
- `src/components/LinkedInImportButton.tsx` (novo)
- `src/options.tsx` (integrar no Personal Info)

---

#### 1.3 Tags e Notas nas Aplicações

**Descrição:** Organização avançada com tags e notas

**Funcionalidades:**

- Tags: "Dream companies", "Remote only", "Urgente"
- Notas livres para cada candidatura
- Sistema de favoritos (⭐)
- Filtros por tags na lista

**Esforço:** Baixo  
**Impacto:** ⭐⭐⭐⭐ Médio-Alto

**Ficheiros a Modificar:**

- `src/types/userProfile.ts` (adicionar campos tags/notes)
- `src/tabs/dialog.tsx` (UI de tags no save form)
- `src/tabs/dialog.tsx` (filtros na lista de aplicações)

---

### 🎯 PRIORIDADE 2: Médio Prazo, Alto Valor

#### 2.1 Analytics Dashboard

**Descrição:** Dashboard com estatísticas da procura de emprego

**Métricas:**

- Taxa de conversão por etapa do pipeline
- Média de match score por tipo de vaga
- Tempo médio entre aplicação e resposta
- Gráficos de atividade semanal/mensal
- Top empresas aplicadas

**Visualização:**

- Gráfico de funil (Funnel Chart)
- Linha temporal de aplicações
- Bar chart de match scores
- KPI cards (total aplicações, taxa resposta, etc.)

**Esforço:** Médio-Alto  
**Impacto:** ⭐⭐⭐⭐⭐ Alto

**Ficheiros a Criar:**

- `src/components/AnalyticsDashboard.tsx`
- `src/utils/analytics.ts` (cálculos)
- Novo separador "Analytics" em options.tsx

---

#### 2.2 Follow-up Reminders

**Descrição:** Lembretes automáticos para follow-ups profissionais

**Tipos de Lembretes:**

- Thank-you note: 24h após entrevista
- Follow-up: 1 semana após aplicação sem resposta
- Preparação: 1 dia antes de entrevista

**Integração:**

- Chrome alarms API
- Browser notifications
- Agendamento automático baseado em status changes

**Esforço:** Médio  
**Impacto:** ⭐⭐⭐⭐ Alto

**Ficheiros a Criar/Modificar:**

- `src/background/alarms.ts` (novo)
- `src/utils/reminders.ts` (novo)
- `src/options.tsx` (settings de notificações)
- `manifest.json` (permissões de notificação)

---

#### 2.3 Cover Letter Snippets Library

**Descrição:** Biblioteca de parágrafos reutilizáveis

**Funcionalidades:**

- Guardar snippets com título e categoria
- Categorias: Motivation, Company Fit, Technical Skills, Closing
- Quick-insert durante geração de cover letter
- Sugestões baseadas no tipo de vaga

**Esforço:** Médio  
**Impacto:** ⭐⭐⭐⭐ Médio-Alto

**Ficheiros a Criar/Modificar:**

- `src/types/config.ts` (tipo Snippet)
- `src/components/SnippetLibrary.tsx` (novo)
- Novo separador "Snippets" em options.tsx

---

### 🎯 PRIORIDADE 3: Avançado, Diferenciação

#### 3.1 Suporte para Mais Job Boards

**Descrição:** Parsing automático de mais plataformas de emprego

**Plataformas Alvo:**

- Indeed (maior job board mundial)
- Glassdoor (reviews + jobs)
- Greenhouse (muitas startups usam)
- Lever (outro ATS popular)
- Workday (usado por grandes empresas)
- AngelList/Wellfound (startups)

**Implementação:**

- Content scripts específicos por domínio
- Parsers de DOM adaptados a cada estrutura
- Fallback para seleção manual

**Esforço:** Alto  
**Impacto:** ⭐⭐⭐⭐ Alto

**Ficheiros a Criar:**

- `src/contents/indeed-job.ts`
- `src/contents/glassdoor-job.ts`
- `src/contents/greenhouse-job.ts`
- etc.

---

#### 3.2 ATS Compatibility Checker

**Descrição:** Verificar se o CV passará nos sistemas automáticos

**Checks:**

- Formato simples (sem tabelas, colunas)
- Keywords da job description presentes
- Standard section headers
- Tamanho de ficheiro adequado
- Fonte readable

**Score:**

- Compatibilidade 0-100%
- Sugestões específicas de melhoria
- Comparação com job description

**Esforço:** Médio  
**Impacto:** ⭐⭐⭐⭐ Médio-Alto

**Ficheiros a Criar:**

- `src/utils/atsChecker.ts` (novo)
- Componente de score na tela de success

---

#### 3.3 Salary Tracking

**Descrição:** Registar e comparar salários/ranges

**Campos:**

- Salary range na job posting
- Offer amount quando muda para "Offer"
- Benefícios (opcional)

**Visualização:**

- Comparador lado-a-lado de ofertas
- Gráfico de evolução salarial
- Médias por tipo de posição

**Esforço:** Baixo  
**Impacto:** ⭐⭐⭐ Médio

---

### 🎯 PRIORIDADE 4: Nice-to-Have

#### 4.1 Dark Mode

**Descrição:** Tema escuro para toda a aplicação

**Implementação:**

- Tailwind dark mode
- Toggle nas settings
- Persistência de preferência

**Esforço:** Baixo  
**Impacto:** ⭐⭐ Baixo-Médio

---

#### 4.2 Keyboard Shortcuts

**Descrição:** Atalhos de teclado para power users

**Shortcuts:**

- `Cmd/Ctrl+Shift+J`: Abrir extensão
- `Cmd/Ctrl+Enter`: Gerar documentos
- `Esc`: Fechar modais

**Esforço:** Baixo  
**Impacto:** ⭐⭐ Baixo

---

## Roadmap de Implementação

### Fase 1: Fundação (Sprint 1-2) 🚧 EM PROGRESSO

**Meta:** Features de maior impacto imediato

- ✅ **Export PDF** - Resolve problema crítico
- 🔄 **Tags e Notas** - Melhoria rápida de UX
- ⏳ **Dark Mode** - Facilita implementação futura

**Deliverables:**

- ✅ PDF generation funcionando (2026-03-06)
- 🔄 Sistema de tags em desenvolvimento
- ⏳ Tema escuro pendente

---

### Fase 2: Engajamento (Sprint 3-4)

**Meta:** Reduzir fricção e aumentar retenção

4. **LinkedIn Import** - Onboarding simplificado
5. **Snippets Library** - Produtividade
6. **Salary Tracking** - Dados valiosos

**Deliverables:**

- Importação de perfil funcionando
- Biblioteca de snippets com 5+ exemplos
- Tracking salarial básico

---

### Fase 3: Inteligência (Sprint 5-6)

**Meta:** Insights e automação

7. **Analytics Dashboard** - Visibilidade do progresso
8. **Follow-up Reminders** - Automação de workflow
9. **ATS Checker** - Diferenciação técnica

**Deliverables:**

- Dashboard com 3+ gráficos
- Sistema de lembretes com notificações
- ATS score na geração de docs

---

### Fase 4: Expansão (Sprint 7-8)

**Meta:** Cobertura mais ampla

10. **Suporte Indeed** - Maior job board
11. **Suporte Greenhouse/Lever** - ATS populares
12. **Integração Email** - Draft de follow-ups

**Deliverables:**

- Parsing automático em 3+ plataformas
- Templates de email para follow-up

---

## Notas de Implementação

### Considerações Técnicas

**Performance:**

- Manter bundle size < 2MB
- Lazy loading de componentes pesados (charts)
- Cache de chamadas API

**Storage:**

- PerplexityConfig não é synced (contém API keys)
- Dados sensíveis nunca em plain text

**Segurança:**

- Sanitize inputs de utilizador
- Validar dados importados
- CSP headers adequados

### Dependências Potenciais

```json
{
  "jspdf": "^2.5.1",
  "html2canvas": "^1.4.1",
  "recharts": "^2.10.0",
  "date-fns": "^2.30.0"
}
```

### Testes Recomendados

- Unit tests para parsers de job descriptions
- Integration tests para flow de geração de PDF
- E2E tests para principais user flows

---

## Conclusão

O JobTailor tem uma base sólida com arquitetura extensível. As features propostas seguem uma ordem de prioridade baseada em:

1. **Impacto imediato no utilizador** (PDF export, LinkedIn import)
2. **Redução de fricção** (Tags, Snippets)
3. **Diferenciação competitiva** (ATS Checker, Analytics)
4. **Expansão de mercado** (Mais job boards)

**Próximo Passo Recomendado:** Começar pela Fase 1 com Export PDF, pois resolve uma necessidade crítica imediata.

---

**Documento criado por:** Claude (Opencode AI)  
**Última atualização:** 2026-03-06
