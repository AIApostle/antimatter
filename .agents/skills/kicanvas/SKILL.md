---
name: kicanvas
description: Expert guide for integrating KiCanvas, embedding the interactive WebGL KiCad schematic and PCB viewer, parsing/generating KiCad S-expressions (.kicad_sch, .kicad_pcb), and handling real-time visual updates.
---

# KiCanvas Integration & KiCad S-Expression Skill

This skill provides comprehensive instructions for embedding and controlling KiCanvas, the browser-based interactive viewer for KiCad schematics and PCB layouts.

---

## 1. KiCanvas Web Component Architecture

KiCanvas renders native KiCad 6/7/8/9 files directly in the browser via WebGL and Canvas without requiring a backend rendering pipeline or KiCad desktop installation.

### 1.A Script Embedding
Load `kicanvas.js` as an ES module:
```html
<script type="module" src="/kicanvas/kicanvas.js"></script>
```

### 1.B Embedding Syntax in React & TypeScript

Declare custom elements for TypeScript JSX:
```typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'kicanvas-embed': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        controls?: 'full' | 'basic' | 'none';
        controlslist?: string;
      }, HTMLElement>;
      'kicanvas-source': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        name?: string;
      }, HTMLElement>;
    }
  }
}
```

### 1.C Loading Dynamic S-Expression Data
KiCanvas supports both URL `src` and dynamic inline sources or Blob URLs:
```tsx
// Using Blob URLs for instant reactive updates when agent streams new code:
const schBlobUrl = useMemo(() => {
  const blob = new Blob([schematicSExpr], { type: 'text/plain' });
  return URL.createObjectURL(blob);
}, [schematicSExpr]);

<kicanvas-embed controls="full">
  <kicanvas-source src={schBlobUrl} name="project.kicad_sch"></kicanvas-source>
</kicanvas-embed>
```

---

## 2. KiCad S-Expression Standards

### 2.A Schematic File (`.kicad_sch`) Structure
Valid KiCad 7/8 schematic files follow this S-expression syntax:
```lisp
(kicad_sch (version 20230121) (generator "antimotion")
  (uuid "d0b1a2c3-4e5f-6a7b-8c9d-0e1f2a3b4c5d")
  (paper "A4")
  (title_block
    (title "Antimotion Circuit")
    (date "2026-09-14")
    (rev "1.0")
    (company "Antimotion")
  )
  (lib_symbols
    ;; Embedded symbol definitions for offline rendering
  )
  ;; Symbol instances (resistors, capacitors, ICs)
  (symbol (lib_id "Device:R") (at 100 80 0) (unit 1)
    (in_bom yes) (on_board yes)
    (uuid "...")
    (property "Reference" "R1" (at 100 75 0) (effects (font (size 1.27 1.27))))
    (property "Value" "10k" (at 100 85 0) (effects (font (size 1.27 1.27))))
    (property "Footprint" "Resistor_SMD:R_0805_2012Metric" (at 100 80 0) (effects (font (size 1.27 1.27)) hide))
  )
  ;; Wires connecting pins
  (wire (pts (xy 90 80) (xy 100 80)) (stroke (width 0) (type default)) (uuid "..."))
  ;; Net labels
  (label "VCC" (at 90 80 0) (fields_autoplaced) (effects (font (size 1.27 1.27)) (justify left bottom)) (uuid "..."))
  (sheet_instances (path "/" (page "1")))
)
```

### 2.B PCB Board File (`.kicad_pcb`) Structure
Valid KiCad PCB files contain layers, footprints, tracks, vias, and board outline:
```lisp
(kicad_pcb (version 20221018) (generator "antimotion")
  (general (thickness 1.6))
  (paper "A4")
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (32 "B.Adhes" user "B.Adhesive")
    (33 "F.Adhes" user "F.Adhesive")
    (34 "B.Paste" user)
    (35 "F.Paste" user)
    (36 "B.SilkS" user "B.Silkscreen")
    (37 "F.SilkS" user "F.Silkscreen")
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (44 "Edge.Cuts" user)
  )
  (setup
    (pad_to_mask_clearance 0.05)
    (pcbplotparams (layerselection 0x00010fc_ffffffff))
  )
  (net 0 "")
  (net 1 "GND")
  (net 2 "+3V3")
  (net 3 "VIN")
  ;; Board outline in Edge.Cuts
  (gr_rect (start 20 20) (end 80 60) (stroke (width 0.15) (type default)) (layer "Edge.Cuts") (uuid "..."))
  ;; Footprint placement
  (footprint "Package_TO_SOT_SMD:SOT-223-3_TabPin2" (layer "F.Cu")
    (at 45 40 0)
    (property "Reference" "U1" (at 45 35 0) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))))
    (property "Value" "AMS1117-3.3" (at 45 45 0) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15))))
    (pad "1" smd rect (at -2.3 0 0) (size 1.5 1.8) (layers "F.Cu" "F.Paste" "F.Mask") (net 1 "GND"))
    (pad "2" smd rect (at 0 0 0) (size 1.5 1.8) (layers "F.Cu" "F.Paste" "F.Mask") (net 2 "+3V3"))
    (pad "3" smd rect (at 2.3 0 0) (size 1.5 1.8) (layers "F.Cu" "F.Paste" "F.Mask") (net 3 "VIN"))
  )
  ;; Routed tracks
  (segment (start 47.3 40) (end 55 40) (width 0.3) (layer "F.Cu") (net 3) (uuid "..."))
)
```

---

## 3. Best Practices for Reactive EDA Updates
1. **Preserve UUIDs**: Never randomly regenerate UUIDs across iterations; retain component UUIDs so KiCanvas diffs highlight modified parts rather than resetting pan/zoom camera.
2. **Always include (lib_symbols)**: Include essential symbol primitives inside the `.kicad_sch` so KiCanvas can render pins, bodies, and text without external library paths.
3. **Handle Controls Gracefully**: Enable `controls="full"` for editing and inspecting, `controlslist="nodownload"` when restricting exports, or custom overlays via the DOM event API.
