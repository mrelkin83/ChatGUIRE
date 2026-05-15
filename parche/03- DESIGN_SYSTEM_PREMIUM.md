# DESIGN SYSTEM v1 — PLATAFORMA OMNICANAL SaaS
# Sistema de diseño premium para el dashboard administrativo
# APLICA SOBRE: PROMPT_MAESTRO_v5_DEFINITIVO.md

> **Destino:** Claude Code (VS Code, Windows nativo)  
> **Framework:** Next.js 14 + Tailwind CSS 3.4 + Framer Motion  
> **Filosofía:** Luxury-tech — sofisticado, inmersivo, con profundidad visual

---

## INSTRUCCIÓN PARA CLAUDE CODE

Este documento define el sistema de diseño completo del dashboard. **Cada componente, página, modal, tabla y formulario debe seguir estas especificaciones.** No uses componentes genéricos de shadcn/ui sin customizarlos. El dashboard debe verse como un producto SaaS premium de $200/mes, no como un template gratuito.

**Prioridad:** Primero que se vea espectacular, después corregimos flujo y lógica. El diseño es la primera impresión y define la percepción del producto.

---

## 1. DIRECCIÓN ESTÉTICA

### 1.1 Concepto: "Obsidian Glass"

El dashboard vive en un universo visual de **cristal oscuro con profundidad**. Imagina una interfaz tallada en obsidiana con reflejos de luz que revelan capas de información. El efecto glassmorphism no es decorativo — es estructural: cada panel es un "vidrio" con un nivel de profundidad distinto.

**Palabras clave:** Profundidad. Luz sutil. Cristal. Precisión. Lujo silencioso.

### 1.2 Principios

```
1. PROFUNDIDAD SOBRE PLANITUD
   Cada elemento tiene una capa Z. Los fondos tienen texturas sutiles.
   Los paneles flotan con sombras reales. Nada se ve "pegado" al fondo.

2. LUZ COMO GUÍA
   Los acentos de color son fuentes de luz. Un botón primario "brilla".
   Los bordes tienen reflejos sutiles. Los hovers iluminan.

3. DENSIDAD INFORMATIVA CON ELEGANCIA
   Mucha información, cero ruido visual. La tipografía hace el trabajo.
   Los espacios respiran. Las tablas son legibles a cualquier hora.

4. MOVIMIENTO CON PROPÓSITO
   Cada animación comunica: aparición = "llegó dato nuevo",
   slide = "cambio de contexto", pulse = "requiere atención".
   Nunca animación por decoración.
```

---

## 2. TOKENS DE DISEÑO (CSS Variables)

```css
/* apps/web/src/app/globals.css */

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  /* ─── Tipografía ─── */
  --font-primary: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* ─── Paleta base (modo oscuro por defecto) ─── */
  --bg-root: #08090E;                    /* Fondo absoluto */
  --bg-surface-1: #0F1117;              /* Primera capa: sidebar, navbar */
  --bg-surface-2: #161821;              /* Segunda capa: cards, paneles */
  --bg-surface-3: #1C1E2A;              /* Tercera capa: hovers, selecciones */
  --bg-surface-glass: rgba(22, 24, 33, 0.72); /* Glassmorphism */

  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-glow: rgba(99, 102, 241, 0.40);  /* Borde que "brilla" */

  /* ─── Texto ─── */
  --text-primary: #F0F0F5;
  --text-secondary: #8B8D9E;
  --text-tertiary: #5C5E6E;
  --text-inverse: #08090E;

  /* ─── Acentos — sistema de "luces" ─── */
  --accent-primary: #6366F1;             /* Indigo — acción principal */
  --accent-primary-hover: #818CF8;
  --accent-primary-glow: rgba(99, 102, 241, 0.25);
  --accent-primary-subtle: rgba(99, 102, 241, 0.12);

  --accent-success: #10B981;             /* Esmeralda — confirmaciones */
  --accent-success-glow: rgba(16, 185, 129, 0.25);
  --accent-success-subtle: rgba(16, 185, 129, 0.12);

  --accent-warning: #F59E0B;             /* Ámbar — alertas */
  --accent-warning-glow: rgba(245, 158, 11, 0.25);
  --accent-warning-subtle: rgba(245, 158, 11, 0.12);

  --accent-danger: #EF4444;              /* Rojo — errores, destrucción */
  --accent-danger-glow: rgba(239, 68, 68, 0.25);
  --accent-danger-subtle: rgba(239, 68, 68, 0.12);

  --accent-info: #3B82F6;                /* Azul — informativo */

  /* ─── Canales (colores por red social) ─── */
  --channel-whatsapp: #25D366;
  --channel-instagram: #E1306C;
  --channel-facebook: #1877F2;
  --channel-tiktok: #FE2C55;

  /* ─── Gradientes ─── */
  --gradient-primary: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%);
  --gradient-success: linear-gradient(135deg, #10B981 0%, #34D399 100%);
  --gradient-surface: linear-gradient(180deg, var(--bg-surface-2) 0%, var(--bg-surface-1) 100%);
  --gradient-mesh: radial-gradient(at 20% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                   radial-gradient(at 80% 20%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
                   radial-gradient(at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 70%);

  /* ─── Sombras ─── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.4), 0 4px 10px rgba(0, 0, 0, 0.25);
  --shadow-xl: 0 20px 50px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(0, 0, 0, 0.3);
  --shadow-glow-primary: 0 0 20px var(--accent-primary-glow), 0 0 40px rgba(99, 102, 241, 0.10);
  --shadow-glow-success: 0 0 20px var(--accent-success-glow);

  /* ─── Bordes redondeados ─── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* ─── Glassmorphism ─── */
  --glass-blur: blur(20px);
  --glass-saturate: saturate(180%);

  /* ─── Transiciones ─── */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-default: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ─── Modo claro (toggle en settings) ─── */
[data-theme="light"] {
  --bg-root: #F5F6FA;
  --bg-surface-1: #FFFFFF;
  --bg-surface-2: #F0F1F5;
  --bg-surface-3: #E8E9F0;
  --bg-surface-glass: rgba(255, 255, 255, 0.78);
  --border-subtle: rgba(0, 0, 0, 0.05);
  --border-default: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.14);
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.10);
}

/* ─── Fondo con textura mesh ─── */
body {
  background-color: var(--bg-root);
  background-image: var(--gradient-mesh);
  background-attachment: fixed;
  color: var(--text-primary);
  font-family: var(--font-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 3. COMPONENTES CORE

### 3.1 Glass Card (componente base de todo panel)

```tsx
// apps/web/src/components/ui/glass-card.tsx
//
// Cada panel, card, sección del dashboard usa este componente.
// Tiene 3 variantes de profundidad: surface-1, surface-2, surface-3.
//
// <GlassCard depth={2} glow="primary" hover>
//   <content />
// </GlassCard>
//
// ESTILOS:
// - Background: var(--bg-surface-glass) con backdrop-filter: blur(20px) saturate(180%)
// - Border: 1px solid var(--border-subtle) con efecto de "reflejo" en el borde superior:
//   border-top: 1px solid rgba(255, 255, 255, 0.10)  ← simula reflejo de luz
// - Border-radius: var(--radius-lg)
// - Shadow: var(--shadow-md)
// - Hover (si prop hover=true):
//   transform: translateY(-2px)
//   box-shadow: var(--shadow-lg)
//   border-color: var(--border-strong)
//   transition: var(--transition-default)
// - Glow (si prop glow="primary"):
//   box-shadow añade var(--shadow-glow-primary)
//   border-color: var(--border-glow)
//
// ANIMACIÓN DE ENTRADA (Framer Motion):
// initial={{ opacity: 0, y: 20 }}
// animate={{ opacity: 1, y: 0 }}
// transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
```

### 3.2 Sidebar (Navegación principal)

```tsx
// apps/web/src/components/dashboard/sidebar.tsx
//
// DISEÑO:
// - Ancho: 72px colapsado (solo iconos), 260px expandido
// - Background: var(--bg-surface-1) con borde derecho var(--border-subtle)
// - Fijo en el lado izquierdo, 100vh
// - Toggle collapse/expand con animación suave
//
// LOGO (arriba):
// - Contenedor circular 44px con gradient-primary como fondo
// - Icono del producto en blanco (SVG)
// - Hover: glow sutil
//
// ITEMS DE NAVEGACIÓN:
// - Icono SVG (24x24) + texto (solo visible si expandido)
// - Estado normal: text-secondary, sin fondo
// - Estado hover: bg-surface-3, text-primary, transición 150ms
// - Estado activo: bg con accent-primary-subtle, text-primary,
//   borde izquierdo 3px solid accent-primary,
//   icono con color accent-primary
// - Tooltip al hover cuando colapsado (con animación fade-in)
//
// SECCIÓN DE CANALES (indicadores de estado):
// - Punto de color por canal (WhatsApp verde, IG rosado, etc.)
// - Punto pulsa si hay mensajes sin leer (animación CSS pulse)
// - Badge con número de mensajes sin leer
//
// USUARIO (abajo):
// - Avatar circular 36px con borde gradient-primary
// - Nombre + rol (si expandido)
// - Menú dropdown: Settings, Theme toggle, Logout
//
// ICONOS: Usar lucide-react para todos los iconos del sidebar.
// Inbox (MessageSquare), Orders (ShoppingBag), Appointments (Calendar),
// Catalog (Package), Channels (Radio), AI Config (Brain),
// Analytics (BarChart3), Team (Users), Settings (Settings)
```

### 3.3 Navbar (Top bar)

```tsx
// apps/web/src/components/dashboard/navbar.tsx
//
// DISEÑO:
// - Altura: 64px
// - Background: var(--bg-surface-glass) con backdrop-filter (glassmorphism)
// - Borde inferior: var(--border-subtle)
// - Sticky top: 0, z-index: 50
//
// CONTENIDO (izquierda a derecha):
// 1. BREADCRUMB: "Dashboard / Inbox" en text-secondary, página actual en text-primary bold
// 2. SPACER
// 3. SEARCH: Input con icono Search, fondo bg-surface-2, borde transparent,
//    focus: borde accent-primary con glow sutil, width: 280px → 360px al focus (transición)
// 4. CANAL STATUS: 4 puntos con color del canal + tooltip con estado
// 5. NOTIFICATIONS: Campana con badge rojo si hay notificaciones
//    Click → dropdown con lista de notificaciones
// 6. QUICK ACTIONS: Botón "+" que abre command palette (⌘K)
```

### 3.4 Botones

```tsx
// Sistema de botones con 4 variantes:
//
// PRIMARY (acción principal):
// - Background: var(--gradient-primary)
// - Color: white
// - Padding: 10px 20px
// - Border-radius: var(--radius-md)
// - Shadow: var(--shadow-sm)
// - Hover: brightness(1.1), shadow-glow-primary, translateY(-1px)
// - Active: brightness(0.95), translateY(0)
// - Disabled: opacity 0.5, cursor not-allowed
// - Transición: var(--transition-fast)
//
// SECONDARY (acción secundaria):
// - Background: var(--bg-surface-3)
// - Color: var(--text-primary)
// - Border: 1px solid var(--border-default)
// - Hover: border-color border-strong, bg-surface lighten
//
// GHOST (acción terciaria):
// - Background: transparent
// - Color: var(--text-secondary)
// - Hover: bg-surface-3, text-primary
//
// DANGER (destrucción):
// - Background: var(--accent-danger-subtle)
// - Color: var(--accent-danger)
// - Hover: background accent-danger, color white
//
// TAMAÑOS: sm (h-8 px-3 text-xs), md (h-10 px-4 text-sm), lg (h-12 px-6 text-base)
//
// LOADING STATE: Spinner SVG animado reemplaza el texto. Botón deshabilitado.
// Icon buttons: Mismo sistema pero cuadrado (w=h) con icono centrado.
```

### 3.5 KPI Cards (Dashboard overview)

```tsx
// apps/web/src/components/dashboard/kpi-card.tsx
//
// <KPICard
//   title="Ventas hoy"
//   value="$2.450.000"
//   change="+12.5%"
//   trend="up"
//   icon={<ShoppingBag />}
//   sparkline={[12, 15, 8, 22, 18, 25, 30]}
// />
//
// DISEÑO:
// - Usa GlassCard como base (depth=2, hover=true)
// - Padding: 20px 24px
// - Layout:
//   ┌────────────────────────────┐
//   │ 📦  Ventas hoy       +12% │  ← Icono (en círculo con accent-subtle) + título + badge trend
//   │                            │
//   │ $2.450.000                 │  ← Valor grande: text-2xl font-bold
//   │ ▁▂▃▅▄▆▇                   │  ← Sparkline mini (SVG, 60px alto, accent-primary)
//   └────────────────────────────┘
//
// TREND BADGE:
// - Up: bg accent-success-subtle, text accent-success, icono TrendingUp
// - Down: bg accent-danger-subtle, text accent-danger, icono TrendingDown
//
// ICONO CIRCULAR:
// - Fondo: accent-primary-subtle (o success, warning según tipo)
// - Icono: color accent-primary
// - Tamaño: 40px
//
// SPARKLINE:
// - SVG path con stroke accent-primary, fill gradient de accent-primary a transparent
// - Animación de entrada: path se dibuja de izquierda a derecha (stroke-dasharray)
//
// ANIMACIÓN DE ENTRADA:
// - Staggered: cada card aparece con 100ms de delay
// - motion.div con initial={{ opacity: 0, y: 20 }}, animate={{ opacity: 1, y: 0 }}
```

### 3.6 Tablas de datos

```tsx
// apps/web/src/components/ui/data-table.tsx
//
// DISEÑO DE TABLA PREMIUM:
// - Container: GlassCard con overflow hidden
// - Header:
//   background: var(--bg-surface-3)
//   text: var(--text-secondary) uppercase tracking-wider text-xs font-semibold
//   padding: 14px 20px
//   border-bottom: var(--border-default)
//   sticky top (si tabla scrolleable)
//
// - Rows:
//   padding: 14px 20px
//   border-bottom: var(--border-subtle)
//   hover: background var(--bg-surface-3) con transición 150ms
//   last-child: sin border-bottom
//
// - Zebra striping: NO. Usar hover highlight en su lugar.
//
// - Celdas de estado (badges):
//   Confirmada: bg accent-success-subtle, text accent-success, dot verde pulsante
//   Pendiente: bg accent-warning-subtle, text accent-warning
//   Cancelada: bg accent-danger-subtle, text accent-danger
//   En proceso: bg accent-info con opacity 0.12, text accent-info
//
// - Acciones por fila:
//   Iconos ghost en la última columna, visibles solo on hover de la fila
//   Hover del icono: bg-surface-3, border-radius full
//
// - Paginación (footer):
//   bg-surface-3, border-top, flex justify-between
//   "Mostrando 1-10 de 47" en text-secondary
//   Botones de página: ghost, activo con accent-primary-subtle
//
// - Empty state:
//   Ilustración SVG sutil (líneas finas en text-tertiary)
//   Texto: "No hay datos aún" en text-secondary
//   CTA button: "Crear primero" en accent-primary
//
// - Loading state:
//   Skeleton rows (bg-surface-3 con shimmer animation)
//   3-5 rows de skeleton
//
// SKELETON SHIMMER:
// @keyframes shimmer {
//   0% { background-position: -200% 0; }
//   100% { background-position: 200% 0; }
// }
// .skeleton {
//   background: linear-gradient(90deg, var(--bg-surface-2) 25%, var(--bg-surface-3) 50%, var(--bg-surface-2) 75%);
//   background-size: 200% 100%;
//   animation: shimmer 1.5s infinite;
//   border-radius: var(--radius-sm);
// }
```

### 3.7 Modales

```tsx
// apps/web/src/components/ui/modal.tsx
//
// OVERLAY:
// - Background: rgba(0, 0, 0, 0.60)
// - backdrop-filter: blur(8px)
// - Animación entrada: opacity 0 → 1 (200ms)
//
// MODAL PANEL:
// - Background: var(--bg-surface-1)
// - Border: 1px solid var(--border-default)
// - Border-top: 1px solid rgba(255,255,255,0.08) (reflejo)
// - Border-radius: var(--radius-xl)
// - Shadow: var(--shadow-xl)
// - Max-width: 520px (sm), 680px (md), 900px (lg)
// - Max-height: 85vh con overflow-y auto
//
// ANIMACIÓN ENTRADA (Framer Motion):
// initial={{ opacity: 0, scale: 0.95, y: 10 }}
// animate={{ opacity: 1, scale: 1, y: 0 }}
// exit={{ opacity: 0, scale: 0.95, y: 10 }}
// transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
//
// HEADER:
// - Padding: 24px 28px 16px
// - Título: text-lg font-semibold text-primary
// - Subtítulo (si hay): text-sm text-secondary, margin-top 4px
// - Close button: Ghost icon button arriba derecha, hover bg-surface-3
// - Borde inferior: var(--border-subtle)
//
// BODY:
// - Padding: 20px 28px
//
// FOOTER:
// - Padding: 16px 28px 24px
// - Border-top: var(--border-subtle)
// - Flex justify-end gap-3
// - Botón cancelar: secondary
// - Botón confirmar: primary
```

### 3.8 Formularios (Inputs, Selects, Textareas)

```tsx
// apps/web/src/components/ui/form-field.tsx
//
// INPUT:
// - Background: var(--bg-surface-2)
// - Border: 1px solid var(--border-default)
// - Border-radius: var(--radius-md)
// - Padding: 10px 14px
// - Color: var(--text-primary)
// - Placeholder: var(--text-tertiary)
// - Font-size: 14px
// - Height: 42px
//
// Focus:
// - Border-color: var(--accent-primary)
// - Box-shadow: 0 0 0 3px var(--accent-primary-glow)
// - Outline: none
// - Transición: var(--transition-fast)
//
// Error:
// - Border-color: var(--accent-danger)
// - Box-shadow: 0 0 0 3px var(--accent-danger-glow)
// - Mensaje de error: text-xs text-danger, margin-top 6px, con icono AlertCircle
//
// LABEL:
// - text-sm font-medium text-secondary
// - margin-bottom: 6px
// - Required: añadir * en accent-danger
//
// SELECT:
// - Mismo estilo que input
// - Dropdown: bg-surface-1, border border-default, radius-lg, shadow-lg
// - Items: padding 8px 14px, hover bg-surface-3
// - Item seleccionado: bg accent-primary-subtle, text-primary
// - Animación: dropdown aparece con scaleY(0.95) → scaleY(1), opacity
//
// TEXTAREA:
// - Mismo estilo que input pero min-height: 100px, resize vertical
//
// TOGGLE/SWITCH:
// - Track: 44px × 24px, bg-surface-3 (off), accent-primary (on)
// - Thumb: 20px círculo blanco con shadow-sm
// - Transición suave del thumb con spring animation
//
// CHECKBOX:
// - 18px × 18px, border-radius 4px
// - Unchecked: bg-surface-2, border border-default
// - Checked: bg accent-primary, icono Check blanco con animación scale-in
```

### 3.9 Chat / Inbox (la página más importante)

```tsx
// apps/web/src/app/(dashboard)/inbox/page.tsx
//
// LAYOUT TRES COLUMNAS:
// ┌────────────┬─────────────────────────┬────────────────┐
// │ LISTA      │ CONVERSACIÓN            │ PERFIL CLIENTE │
// │ CONV.      │                         │                │
// │ 320px      │ flex-1                  │ 300px          │
// │            │                         │ (collapsible)  │
// └────────────┴─────────────────────────┴────────────────┘
//
// LISTA DE CONVERSACIONES (columna izquierda):
// - Background: var(--bg-surface-1)
// - Header: "Inbox" + filtros (canal, estado) + search
// - Tabs: "Todos", "Sin leer", "IA", "Agente" con animación de underline
// - Items:
//   ┌─────────────────────────────────┐
//   │ [Avatar] [🟢] Juan Pérez       │  ← Avatar 40px, dot canal, nombre bold
//   │          ¿Tienen talla M en...  │  ← Último mensaje truncado, text-secondary
//   │          hace 2 min        (3)  │  ← Timestamp + badge unread
//   └─────────────────────────────────┘
//   - Seleccionado: bg-surface-3, borde izquierdo accent-primary
//   - Unread: nombre bold, badge numérico con accent-primary
//   - Canal indicator: Dot de color al lado del avatar
//     🟢 WhatsApp, 🟣 Instagram, 🔵 Facebook, ⚫ TikTok
//
// CONVERSACIÓN (columna central):
// - Header: Nombre + canal badge + botones (Tomar control, Devolver a IA, Cerrar)
// - Messages:
//   - Customer (izquierda):
//     bg-surface-2, border-radius 16px 16px 16px 4px
//     max-width: 70%, padding 12px 16px
//   - AI/Agent (derecha):
//     bg gradient-primary (sutil), border-radius 16px 16px 4px 16px
//     max-width: 70%, padding 12px 16px
//   - System messages: centrados, text-xs text-tertiary, con icono
//   - Timestamp: debajo de cada burbuja, text-xs text-tertiary
//   - Media: imágenes con border-radius, click para ampliar
//   - Typing indicator: 3 dots pulsantes en burbuja
//
// - Input area (abajo):
//   bg-surface-1, border-top border-subtle, padding 12px 16px
//   Input: multi-line, con placeholder "Escribe un mensaje..."
//   Botones: Attach (📎), Image (📷), Template (📝), Send (gradient-primary, circular)
//   Send button: hover glow, disabled si input vacío
//
// PERFIL CLIENTE (columna derecha, collapsible):
// - Header: Avatar grande (64px), nombre, canal preferido
// - Secciones colapsables con animación:
//   📱 Contacto: teléfono, email, documento
//   📦 Pedidos recientes: lista mini con estado
//   📅 Citas: próxima cita con countdown
//   🏷️ Tags: chips editables
//   📊 Métricas: total gastado, # pedidos, antigüedad
```

### 3.10 Channel Connection Page

```tsx
// apps/web/src/app/(dashboard)/channels/page.tsx
//
// Grid de 4 channel cards (2x2):
//
// ┌──────────────────────────┐
// │  [Icon WA grande]        │
// │  WhatsApp                │
// │  ● Conectado             │  ← Dot verde pulsante + texto
// │  +57 300 123 4567        │  ← Número vinculado
// │                          │
// │  [Desconectar]           │  ← Botón danger ghost
// └──────────────────────────┘
//
// Cuando NO conectado, el card muestra:
// - Icono en grayscale con opacity 0.4
// - Botón "Conectar" con gradient-primary
// - Al click: abre modal de conexión
//
// MODAL WHATSAPP CONNECTION:
// - QR code centrado con borde gradient-primary animado (rotating border)
// - Texto: "Escanea con WhatsApp"
// - Alternativa: "¿Prefieres vincular con código?" → muestra 8 dígitos
// - Estado: spinner + "Esperando vinculación..."
// - Éxito: animación checkmark (✓ se dibuja con SVG animate), confetti sutil
//
// ROTATING BORDER QR:
// .qr-container {
//   position: relative;
//   padding: 4px;
//   border-radius: var(--radius-lg);
//   background: conic-gradient(from 0deg, var(--accent-primary), var(--accent-success),
//     var(--accent-primary), transparent 70%);
//   animation: rotate-border 3s linear infinite;
// }
// @keyframes rotate-border {
//   to { background: conic-gradient(from 360deg, ...); }
// }
```

---

## 4. PÁGINAS DEL DASHBOARD

### 4.1 Overview (/) — KPIs + actividad reciente

```
Layout:
┌──────────────────────────────────────────────────────────┐
│ Buenos días, Juan 👋                    [Hoy ▾] [Filtro] │
├──────────┬──────────┬──────────┬─────────────────────────┤
│ KPI:     │ KPI:     │ KPI:     │ KPI:                    │
│ Ventas   │ Mensajes │ Citas    │ Tasa conv.              │
│ $2.4M    │ 347      │ 23       │ 34.2%                   │
├──────────┴──────────┴──────────┴─────────────────────────┤
│                                                          │
│ ┌─────────────────────────┐ ┌──────────────────────────┐ │
│ │ CHART: Ventas 7 días    │ │ CHART: Mensajes por canal│ │
│ │ (area chart, gradient)  │ │ (donut chart, colores    │ │
│ │                         │ │  de cada canal)          │ │
│ └─────────────────────────┘ └──────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────┐ ┌──────────────────────────┐ │
│ │ ACTIVIDAD RECIENTE      │ │ RENDIMIENTO IA           │ │
│ │ (timeline de eventos)   │ │ Resolución: 87%          │ │
│ │                         │ │ Confianza avg: 0.82      │ │
│ │                         │ │ Preguntas sin rta: 5     │ │
│ └─────────────────────────┘ └──────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Charts: usar **Recharts** con colores del design system. Area charts con gradient fill. Donut charts para distribución por canal.

### 4.2 Catálogo — CRUD con formularios dinámicos

- Grid de producto cards con imagen, nombre, precio, stock badge
- Card hover: elevación + preview ampliado
- Formulario de creación: modal lg con secciones colapsables
- Atributos dinámicos (JSONB): renderizar campos según business_type
  - Ropa: talla selector (chips), color picker (swatches circulares)
  - Tech: key-value pairs para specs
  - Salud: duración slider, toggle "requiere referencia"
- Drag & drop para reordenar imágenes
- Variantes: tabla editable inline

### 4.3 Analytics — Gráficos por canal

- Selector de período: tabs "Hoy", "7 días", "30 días", "Custom"
- Gráficos full-width con gradientes
- Desglose por canal con iconos de color
- Tabla de productos/servicios más solicitados
- Métricas de IA: resolución, confianza, escalamientos
- Export: botón para descargar CSV/PDF

---

## 5. ANIMACIONES Y MICROINTERACCIONES

### 5.1 Framer Motion — Patrones obligatorios

```tsx
// STAGGER CONTAINER (para listas y grids):
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
};
const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }
};

// PAGE TRANSITION:
const pageTransition = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  transition: { duration: 0.25 }
};

// NOTIFICATION TOAST:
// Entra desde la derecha con spring animation
// Auto-dismiss en 5s con progress bar en el borde inferior
// Tipos: success (border-left accent-success), error (accent-danger), info (accent-info)

// BADGE PULSE (mensajes sin leer):
@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
.badge-pulse { animation: pulse-badge 2s ease-in-out infinite; }

// SKELETON LOADING:
// Ya definido en sección de tablas. Aplicar a TODA card/panel mientras carga datos.

// NUMBER COUNTER (KPIs):
// Los valores numéricos deben animarse de 0 al valor real al aparecer.
// Usar librería react-countup o implementar con requestAnimationFrame.
```

### 5.2 Transiciones de estado

```
Estado           │ Indicador visual
─────────────────┼──────────────────────────
Conectado        │ Dot verde con pulse lento
Desconectado     │ Dot gris sin animación
Conectando       │ Dot amarillo con pulse rápido
Error            │ Dot rojo con pulse
Mensaje nuevo    │ Badge numérico con bounce-in
IA procesando    │ 3 dots que ondean (wave animation)
Pago confirmado  │ Checkmark SVG que se dibuja
Acción exitosa   │ Toast success con slide-in desde derecha
```

---

## 6. DEPENDENCIAS FRONTEND

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "tailwindcss": "3.4.x",
    "framer-motion": "^11.0",
    "recharts": "^2.12",
    "lucide-react": "^0.383",
    "@radix-ui/react-dialog": "^1.0",
    "@radix-ui/react-dropdown-menu": "^2.0",
    "@radix-ui/react-tabs": "^1.0",
    "@radix-ui/react-toggle": "^1.0",
    "@radix-ui/react-tooltip": "^1.0",
    "@radix-ui/react-select": "^2.0",
    "react-hot-toast": "^2.4",
    "zustand": "^4.5",
    "date-fns": "^3.6",
    "react-countup": "^6.5",
    "qrcode.react": "^3.1",
    "class-variance-authority": "^0.7",
    "clsx": "^2.1",
    "tailwind-merge": "^2.3"
  }
}
```

---

## 7. REGLAS PARA CLAUDE CODE

1. **Cada componente usa CSS variables del design system.** Nunca hardcodear colores.
2. **Glassmorphism en TODOS los paneles.** `backdrop-filter: blur(20px) saturate(180%)`.
3. **Framer Motion para TODAS las transiciones de página y aparición de elementos.**
4. **Stagger animations en listas y grids.** Cada item aparece con 80ms de delay.
5. **Loading states con skeleton shimmer** en TODA tabla, card y sección que cargue datos.
6. **Dark mode por defecto.** Light mode como toggle en settings.
7. **Los KPIs usan number counter animation** — nunca aparecen estáticos.
8. **Los charts usan colores del design system** (accent-primary, channel-whatsapp, etc.).
9. **Los modales tienen overlay blur + panel con spring animation.**
10. **Nunca usar componentes shadcn/ui sin customizar.** Los estilos base se reemplazan con el design system.
11. **Plus Jakarta Sans para todo.** JetBrains Mono solo para código y montos.
12. **Iconos: lucide-react exclusivamente.** Nunca Font Awesome ni emoji como iconos funcionales.
13. **El inbox es la página más importante.** Debe ser fluido, sin lag, con transiciones suaves entre conversaciones.
14. **Mobile responsive:** sidebar se colapsa a bottom nav, inbox pasa a una columna con back navigation.
