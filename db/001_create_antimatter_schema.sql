-- ============================================================================
-- Migration: 001_create_antimatter_schema.sql
-- Description: Core database schema for antimatter AI EDA platform
-- Author: antimatter engineering
-- ============================================================================

-- 1. Projects & Circuit State
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    revision INTEGER DEFAULT 1,
    board_config JSONB DEFAULT '{
        "width": 60.0,
        "height": 45.0,
        "corner_radius": 3.0,
        "layer_count": 2,
        "thickness": 1.6,
        "mask_color": "black",
        "finish": "ENIG"
    }'::jsonb,
    components JSONB DEFAULT '{}'::jsonb,
    nets JSONB DEFAULT '{}'::jsonb,
    schematic_sexpr TEXT DEFAULT '',
    pcb_sexpr TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for speedy project lookup
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects (updated_at DESC);

-- 2. Design Plans & Engineering Change Orders (ECO)
CREATE TABLE IF NOT EXISTS public.design_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    rationale TEXT DEFAULT '',
    components JSONB DEFAULT '[]'::jsonb,
    power_architecture TEXT DEFAULT '',
    layer_stackup TEXT DEFAULT '2-layer FR-4',
    board_dimensions TEXT DEFAULT '50x35mm',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_design_plans_project ON public.design_plans (project_id, created_at DESC);

-- 3. Chat Messages & Agent Streaming Transcripts
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL DEFAULT '',
    thoughts JSONB DEFAULT '[]'::jsonb,
    tool_calls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON public.chat_messages (project_id, created_at ASC);

-- 4. Verified Component Library
CREATE TABLE IF NOT EXISTS public.component_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_prefix TEXT NOT NULL,
    mpn TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    footprint TEXT NOT NULL,
    symbol TEXT NOT NULL,
    description TEXT DEFAULT '',
    pin_count INTEGER DEFAULT 2,
    pin_mapping JSONB DEFAULT '{}'::jsonb,
    datasheet_url TEXT,
    lcsc_part TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_component_library_mpn ON public.component_library (mpn);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_library ENABLE ROW LEVEL SECURITY;

-- Allow public read & write for active projects (local/anon access)
CREATE POLICY "Public full access to projects" ON public.projects
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public full access to design_plans" ON public.design_plans
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public full access to chat_messages" ON public.chat_messages
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read access to component_library" ON public.component_library
    FOR SELECT USING (true);

CREATE POLICY "Public write access to component_library" ON public.component_library
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Seed Default Project & Library Items
-- ============================================================================

INSERT INTO public.projects (id, name, revision, board_config, components, nets)
VALUES (
    'default-power-delivery',
    'ESP32 Power Delivery Board',
    1,
    '{"width": 60.0, "height": 45.0, "corner_radius": 3.0, "layer_count": 2, "mask_color": "black", "finish": "ENIG"}'::jsonb,
    '{
        "J1": {"ref": "J1", "value": "USB-C-16P", "footprint": "Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12", "symbol": "Connector:USB_C_Receptacle_USB2.0", "x": 10.0, "y": 20.0, "rotation": 0.0, "pins": {"A1": {"net": "GND"}, "A4": {"net": "VBUS"}, "A5": {"net": "CC1"}, "A6": {"net": "USB_DP"}, "A7": {"net": "USB_DN"}}},
        "U1": {"ref": "U1", "value": "AMS1117-3.3", "footprint": "Package_TO_SOT_SMD:SOT-223-3_TabPin2", "symbol": "Regulator_Linear:AMS1117-3.3", "x": 30.0, "y": 20.0, "rotation": 0.0, "pins": {"1": {"net": "GND"}, "2": {"net": "3V3"}, "3": {"net": "VBUS"}}},
        "C1": {"ref": "C1", "value": "10uF", "footprint": "Capacitor_SMD:C_0805_2012Metric", "symbol": "Device:C", "x": 22.0, "y": 20.0, "rotation": 90.0, "pins": {"1": {"net": "VBUS"}, "2": {"net": "GND"}}},
        "C2": {"ref": "C2", "value": "10uF", "footprint": "Capacitor_SMD:C_0805_2012Metric", "symbol": "Device:C", "x": 38.0, "y": 20.0, "rotation": 90.0, "pins": {"1": {"net": "3V3"}, "2": {"net": "GND"}}},
        "D1": {"ref": "D1", "value": "Green", "footprint": "LED_SMD:LED_0805_2012Metric", "symbol": "Device:LED", "x": 48.0, "y": 15.0, "rotation": 0.0, "pins": {"1": {"net": "GND"}, "2": {"net": "NET_LED"}}},
        "R1": {"ref": "R1", "value": "1k", "footprint": "Resistor_SMD:R_0805_2012Metric", "symbol": "Device:R", "x": 43.0, "y": 15.0, "rotation": 0.0, "pins": {"1": {"net": "3V3"}, "2": {"net": "NET_LED"}}}
    }'::jsonb,
    '{
        "GND": {"name": "GND", "net_class": "Power", "nodes": [["J1", "A1"], ["U1", "1"], ["C1", "2"], ["C2", "2"], ["D1", "1"]]},
        "VBUS": {"name": "VBUS", "net_class": "Power", "nodes": [["J1", "A4"], ["U1", "3"], ["C1", "1"]]},
        "3V3": {"name": "3V3", "net_class": "Power", "nodes": [["U1", "2"], ["C2", "1"], ["R1", "1"]]},
        "NET_LED": {"name": "NET_LED", "net_class": "Signal", "nodes": [["R1", "2"], ["D1", "2"]]}
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
