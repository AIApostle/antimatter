"""KiCad 7/8 Compatible S-Expression (.kicad_sch & .kicad_pcb) Generator.

Translates CircuitState into fully compliant KiCad S-expressions that render
natively in KiCanvas (WebGL) and desktop KiCad EDA.
"""

from __future__ import annotations
import uuid
from typing import Dict
from .circuit_state import CircuitState, Component


# Embedded minimal lib_symbols for KiCanvas offline rendering
BASE_SYMBOLS = {
    "Device:R": """    (symbol "Device:R" (pin_numbers hide) (pin_names (offset 0)) (in_bom yes) (on_board yes)
      (property "Reference" "R" (at 2.032 0 90) (effects (font (size 1.27 1.27))))
      (property "Value" "R" (at -2.032 0 90) (effects (font (size 1.27 1.27))))
      (property "Footprint" "" (at -1.778 0 90) (effects (font (size 1.27 1.27)) hide))
      (symbol "R_0_1"
        (rectangle (start -1.016 -2.54) (end 1.016 2.54) (stroke (width 0.254) (type default)) (fill (type none)))
      )
      (symbol "R_1_1"
        (pin passive line (at 0 3.81 270) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
        (pin passive line (at 0 -3.81 90) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
      )
    )""",
    "Device:C": """    (symbol "Device:C" (pin_numbers hide) (pin_names (offset 0)) (in_bom yes) (on_board yes)
      (property "Reference" "C" (at 1.524 0 90) (effects (font (size 1.27 1.27))))
      (property "Value" "C" (at -1.524 0 90) (effects (font (size 1.27 1.27))))
      (symbol "C_0_1"
        (polyline (pts (xy -2.032 0.762) (xy 2.032 0.762)) (stroke (width 0.508) (type default)))
        (polyline (pts (xy -2.032 -0.762) (xy 2.032 -0.762)) (stroke (width 0.508) (type default)))
      )
      (symbol "C_1_1"
        (pin passive line (at 0 3.81 270) (length 3.048) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
        (pin passive line (at 0 -3.81 90) (length 3.048) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
      )
    )""",
    "Device:LED": """    (symbol "Device:LED" (pin_numbers hide) (pin_names (offset 0)) (in_bom yes) (on_board yes)
      (property "Reference" "D" (at 2.54 0 90) (effects (font (size 1.27 1.27))))
      (property "Value" "LED" (at -2.54 0 90) (effects (font (size 1.27 1.27))))
      (symbol "LED_0_1"
        (polyline (pts (xy -1.27 1.27) (xy -1.27 -1.27) (xy 1.27 0) (xy -1.27 1.27)) (stroke (width 0.254) (type default)) (fill (type outline)))
        (polyline (pts (xy 1.27 1.27) (xy 1.27 -1.27)) (stroke (width 0.254) (type default)))
      )
      (symbol "LED_1_1"
        (pin passive line (at -3.81 0 0) (length 2.54) (name "A" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
        (pin passive line (at 3.81 0 180) (length 2.54) (name "K" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
      )
    )""",
    "Regulator_Linear:AMS1117-3.3": """    (symbol "Regulator_Linear:AMS1117-3.3" (in_bom yes) (on_board yes)
      (property "Reference" "U" (at 0 6.35 0) (effects (font (size 1.27 1.27))))
      (property "Value" "AMS1117-3.3" (at 0 -6.35 0) (effects (font (size 1.27 1.27))))
      (symbol "AMS1117_0_1"
        (rectangle (start -6.35 -5.08) (end 6.35 5.08) (stroke (width 0.254) (type default)) (fill (type background)))
      )
      (symbol "AMS1117_1_1"
        (pin power_in line (at -8.89 2.54 0) (length 2.54) (name "VIN" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
        (pin power_in line (at 0 -7.62 90) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
        (pin power_out line (at 8.89 2.54 180) (length 2.54) (name "VOUT" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
        (pin power_out line (at 8.89 -2.54 180) (length 2.54) (name "TAB" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
      )
    )""",
    "Regulator_Linear:AP2112K-3.3": """    (symbol "Regulator_Linear:AP2112K-3.3" (in_bom yes) (on_board yes)
      (property "Reference" "U" (at 0 6.35 0) (effects (font (size 1.27 1.27))))
      (property "Value" "AP2112K-3.3" (at 0 -6.35 0) (effects (font (size 1.27 1.27))))
      (symbol "AP2112_0_1"
        (rectangle (start -6.35 -5.08) (end 6.35 5.08) (stroke (width 0.254) (type default)) (fill (type background)))
      )
      (symbol "AP2112_1_1"
        (pin power_in line (at -8.89 2.54 0) (length 2.54) (name "VIN" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
        (pin power_in line (at 0 -7.62 90) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
        (pin input line (at -8.89 -2.54 0) (length 2.54) (name "EN" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
        (pin no_connect line (at 8.89 -2.54 180) (length 2.54) (name "NC" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
        (pin power_out line (at 8.89 2.54 180) (length 2.54) (name "VOUT" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
      )
    )""",
    "Connector_Generic:Conn_01x02": """    (symbol "Connector_Generic:Conn_01x02" (in_bom yes) (on_board yes)
      (property "Reference" "J" (at 0 3.81 0) (effects (font (size 1.27 1.27))))
      (property "Value" "Conn_01x02" (at 0 -3.81 0) (effects (font (size 1.27 1.27))))
      (symbol "Conn_01x02_0_1"
        (rectangle (start -2.54 -2.54) (end 2.54 2.54) (stroke (width 0.254) (type default)) (fill (type background)))
      )
      (symbol "Conn_01x02_1_1"
        (pin passive line (at 5.08 1.27 180) (length 2.54) (name "Pin_1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
        (pin passive line (at 5.08 -1.27 180) (length 2.54) (name "Pin_2" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
      )
    )""",
    "Connector:USB_C_Receptacle_USB2.0": """    (symbol "Connector:USB_C_Receptacle_USB2.0" (in_bom yes) (on_board yes)
      (property "Reference" "J" (at 0 8.89 0) (effects (font (size 1.27 1.27))))
      (property "Value" "USB_C" (at 0 -8.89 0) (effects (font (size 1.27 1.27))))
      (symbol "USB_C_0_1"
        (rectangle (start -7.62 -7.62) (end 7.62 7.62) (stroke (width 0.254) (type default)) (fill (type background)))
      )
      (symbol "USB_C_1_1"
        (pin power_out line (at -10.16 5.08 0) (length 2.54) (name "VBUS" (effects (font (size 1.27 1.27)))) (number "A4" (effects (font (size 1.27 1.27)))))
        (pin power_in line (at -10.16 -5.08 0) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "A1" (effects (font (size 1.27 1.27)))))
        (pin bidirectional line (at 10.16 2.54 180) (length 2.54) (name "D+" (effects (font (size 1.27 1.27)))) (number "A6" (effects (font (size 1.27 1.27)))))
        (pin bidirectional line (at 10.16 -2.54 180) (length 2.54) (name "D-" (effects (font (size 1.27 1.27)))) (number "A7" (effects (font (size 1.27 1.27)))))
        (pin bidirectional line (at 10.16 5.08 180) (length 2.54) (name "CC1" (effects (font (size 1.27 1.27)))) (number "A5" (effects (font (size 1.27 1.27)))))
      )
    )""",
}


def build_lib_symbols(components: Dict[str, Component]) -> str:
    """Build compliant KiCad lib_symbols block ensuring every placed component can be rendered."""
    used_symbols: Dict[str, str] = dict(BASE_SYMBOLS)

    for ref, comp in components.items():
        sym_name = comp.symbol or f"Device:{comp.ref[0]}"
        if sym_name not in used_symbols:
            # Dynamically synthesize compliant symbol block with all pins
            pin_lines = []
            pins = sorted(comp.pins.items())
            half = max(1, (len(pins) + 1) // 2)
            box_height = max(7.62, (half + 1) * 2.54)
            box_width = 8.89

            for i, (p_num, pin_obj) in enumerate(pins):
                p_name = pin_obj.name or p_num
                if i < half:
                    # Left side pins
                    py = (box_height / 2) - (i + 1) * 2.54
                    px = -box_width - 2.54
                    pin_lines.append(
                        f'        (pin passive line (at {px:.2f} {py:.2f} 0) (length 2.54) (name "{p_name}" (effects (font (size 1.27 1.27)))) (number "{p_num}" (effects (font (size 1.27 1.27)))))'
                    )
                else:
                    # Right side pins
                    idx_r = i - half
                    py = (box_height / 2) - (idx_r + 1) * 2.54
                    px = box_width + 2.54
                    pin_lines.append(
                        f'        (pin passive line (at {px:.2f} {py:.2f} 180) (length 2.54) (name "{p_name}" (effects (font (size 1.27 1.27)))) (number "{p_num}" (effects (font (size 1.27 1.27)))))'
                    )

            pins_clause = "\n".join(pin_lines) if pin_lines else f'        (pin passive line (at -8.89 0 0) (length 2.54) (name "1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))'
            clean_name = sym_name.replace('"', '')
            used_symbols[sym_name] = f"""    (symbol "{clean_name}" (in_bom yes) (on_board yes)
      (property "Reference" "{comp.ref[0]}" (at 0 {box_height / 2 + 1.27:.2f} 0) (effects (font (size 1.27 1.27))))
      (property "Value" "{comp.value or clean_name}" (at 0 {-box_height / 2 - 1.27:.2f} 0) (effects (font (size 1.27 1.27))))
      (symbol "{clean_name.split(':')[-1]}_0_1"
        (rectangle (start {-box_width:.2f} {-box_height / 2:.2f}) (end {box_width:.2f} {box_height / 2:.2f}) (stroke (width 0.254) (type default)) (fill (type background)))
      )
      (symbol "{clean_name.split(':')[-1]}_1_1"
{pins_clause}
      )
    )"""

    symbols_joined = "\n".join(used_symbols.values())
    return f"  (lib_symbols\n{symbols_joined}\n  )"


def generate_schematic_sexpr(state: CircuitState) -> str:
    """Generate a valid .kicad_sch S-expression from the active circuit state."""
    sch_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{state.project_id}.sch"))
    
    symbols_output = []
    labels_output = []
    
    # Arrange schematic symbols along a legible grid
    sch_x = 50.0
    sch_y = 50.0
    col = 0

    for ref, comp in sorted(state.components.items()):
        comp_x = sch_x + (col % 4) * 45.0
        comp_y = sch_y + (col // 4) * 45.0
        col += 1

        lib_id = comp.symbol if comp.symbol else f"Device:{comp.ref[0]}"
        if comp.ref.startswith("R"):
            lib_id = "Device:R"
        elif comp.ref.startswith("C"):
            lib_id = "Device:C"
        elif comp.ref.startswith("D"):
            lib_id = "Device:LED"
        elif "AMS1117" in comp.value:
            lib_id = "Regulator_Linear:AMS1117-3.3"
        elif "USB" in comp.value:
            lib_id = "Connector:USB_C_Receptacle_USB2.0"

        symbols_output.append(f"""  (symbol (lib_id "{lib_id}") (at {comp_x:.2f} {comp_y:.2f} 0) (unit 1)
    (in_bom yes) (on_board yes) (dnp no)
    (uuid "{comp.uuid}")
    (property "Reference" "{comp.ref}" (at {comp_x:.2f} {comp_y - 6.35:.2f} 0) (effects (font (size 1.27 1.27))))
    (property "Value" "{comp.value}" (at {comp_x:.2f} {comp_y + 6.35:.2f} 0) (effects (font (size 1.27 1.27))))
    (property "Footprint" "{comp.footprint}" (at {comp_x:.2f} {comp_y:.2f} 0) (effects (font (size 1.27 1.27)) hide))
  )""")

        # Place net labels around connected pins
        for p_idx, (p_num, pin) in enumerate(sorted(comp.pins.items())):
            if pin.net:
                lbl_x = comp_x + (5.0 if p_idx % 2 == 0 else -5.0)
                lbl_y = comp_y + (p_idx * 2.54) - 2.54
                labels_output.append(
                    f'  (label "{pin.net}" (at {lbl_x:.2f} {lbl_y:.2f} 0) (fields_autoplaced) (effects (font (size 1.0 1.0))))'
                )

    symbols_section = "\n".join(symbols_output)
    labels_section = "\n".join(labels_output)
    lib_symbols_section = build_lib_symbols(state.components)

    return f"""(kicad_sch (version 20230121) (generator "antimotion")
  (uuid "{sch_uuid}")
  (paper "A4")
  (title_block
    (title "{state.project_name}")
    (date "2026-09-14")
    (rev "rev-{state.revision}")
    (company "Antimotion AI EDA")
  )
{lib_symbols_section}
{symbols_section}
{labels_section}
  (sheet_instances
    (path "/" (page "1"))
  )
)"""



def generate_pcb_sexpr(state: CircuitState) -> str:
    """Generate a valid .kicad_pcb S-expression from the active circuit state."""
    pcb_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{state.project_id}.pcb"))

    # 1. Build net mappings (net 0 is always "")
    net_indices: Dict[str, int] = {"": 0}
    net_defs = ['  (net 0 "")']
    idx = 1
    for net_name in sorted(state.nets.keys()):
        if net_name:
            net_indices[net_name] = idx
            net_defs.append(f'  (net {idx} "{net_name}")')
            idx += 1

    # 2. Board outline in Edge.Cuts
    bw = state.board.width
    bh = state.board.height
    r = state.board.corner_radius
    outline_sexpr = f"""  (gr_rect (start 0 0) (end {bw:.2f} {bh:.2f}) (stroke (width 0.15) (type default)) (fill none) (layer "Edge.Cuts") (uuid "{uuid.uuid4()}"))"""

    # 3. Footprints
    footprints_output = []
    for ref, comp in sorted(state.components.items()):
        fx = comp.x
        fy = comp.y
        frot = comp.rotation

        pads_sexpr = []
        # Generate pads according to component pin definitions
        for p_num, pin in sorted(comp.pins.items()):
            net_num = net_indices.get(pin.net or "", 0)
            net_name = pin.net or ""
            px = pin.x_offset
            py = pin.y_offset
            net_clause = f'(net {net_num} "{net_name}")' if net_name else ""
            pads_sexpr.append(
                f'    (pad "{p_num}" smd rect (at {px:.2f} {py:.2f} 0) (size 1.2 1.5) (layers "F.Cu" "F.Paste" "F.Mask") {net_clause})'
            )

        pads_body = "\n".join(pads_sexpr)
        footprints_output.append(f"""  (footprint "{comp.footprint}" (layer "{comp.layer}")
    (uuid "{comp.uuid}")
    (at {fx:.2f} {fy:.2f} {frot:.1f})
    (property "Reference" "{comp.ref}" (at 0 -2.5 0) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12))))
    (property "Value" "{comp.value}" (at 0 2.5 0) (layer "F.Fab") (effects (font (size 0.8 0.8) (thickness 0.12))))
{pads_body}
  )""")

    # 4. Routed tracks
    tracks_output = []
    for track in state.tracks:
        net_num = net_indices.get(track.net_name, 0)
        tracks_output.append(
            f'  (segment (start {track.start[0]:.2f} {track.start[1]:.2f}) (end {track.end[0]:.2f} {track.end[1]:.2f}) (width {track.width:.2f}) (layer "{track.layer}") (net {net_num}) (uuid "{track.uuid}"))'
        )

    # 5. Vias
    vias_output = []
    for v in state.vias:
        net_num = net_indices.get(v.net_name, 0)
        vias_output.append(
            f'  (via (at {v.x:.2f} {v.y:.2f}) (size {v.size:.2f}) (drill {v.drill:.2f}) (layers "{v.layers[0]}" "{v.layers[1]}") (net {net_num}) (uuid "{v.uuid}"))'
        )

    nets_block = "\n".join(net_defs)
    footprints_block = "\n".join(footprints_output)
    tracks_block = "\n".join(tracks_output)
    vias_block = "\n".join(vias_output)

    return f"""(kicad_pcb (version 20221018) (generator "antimotion")
  (general
    (thickness {state.board.thickness})
  )
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
    (pcbplotparams
      (layerselection 0x00010fc_ffffffff)
      (plotframeref no)
      (viasonmask no)
      (mode 1)
      (usegerberextensions yes)
      (usegerberattributes yes)
      (usegerberadvancedattributes yes)
    )
  )
{nets_block}
{outline_sexpr}
{footprints_block}
{tracks_block}
{vias_block}
)"""
