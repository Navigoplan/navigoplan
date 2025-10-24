// app/lib/ports/ports.ts
export type CrewType = "marina" | "harbour" | "anchorage" | "pier" | "fuel" | (string & {});

export type Port = {
  id: string;
  region?: string;
  area?: string;
  name_gr?: string;
  name_en?: string;

  guest?: {
    vibe?: string[];
    luxury_score?: number;
    highlight_photo?: string;
    experience_notes?: string;
    recommended_spots?: string[];
  };

  crew?: {
    type?: CrewType;
    lat?: number | null;
    lon?: number | null;
    datum?: string;

    min_depth_m?: number;
    max_depth_m?: number;
    shelter_from?: string[] | string;
    mooring?: string;
    holding?: string;
    vhf_ch?: string;
    dangers?: string;
    approach_notes?: string;

    water?: boolean;
    electricity?: boolean;
    fuel_diesel?: boolean;
    fuel_gasoline?: boolean;
    wifi?: boolean;
    wc?: boolean;
    showers?: boolean;
    laundry?: boolean;
    atm?: boolean;
    supermarket?: boolean;
    pharmacy?: boolean;
    haul_out?: boolean;
    repair?: boolean;
    anchorage_only?: boolean;
    waste_oil?: boolean;
    pump_out?: boolean;
  };

  source?: string;
};
