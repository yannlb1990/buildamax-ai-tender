import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const NCCSearchBar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [summary, setSummary] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const nccSections = {
    "footings": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-b-structure/part-b1-structural-provisions/b1p1-acceptable-construction-manual-structural-provisions",
      summary: "Footing depth: min 150mm below ground, 600mm from surface for good soil. Width based on soil bearing capacity and loads."
    },
    "framing": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-b-structure/part-b1-structural-provisions",
      summary: "Timber framing: studs max 600mm centres, lintels sized per span tables, bracing per AS1684."
    },
    "spacing": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-b-structure",
      summary: "Stud spacing: max 600mm. Joist spacing: per span tables (typically 450-600mm). Rafter spacing: per AS1684."
    },
    "insulation": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-j-energy-efficiency",
      summary: "R-values vary by climate zone. Walls: R1.5-R2.5, Ceiling: R3.5-R6.0, Floor: R1.0-R2.0 depending on zone."
    },
    "waterproofing": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-f-health-and-amenity/part-f1-damp-and-weatherproofing",
      summary: "Wet areas require AS3740 compliance. Min 100mm upstand for shower hobs. Membrane under all tiles in wet areas."
    },
    "fire": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-f-health-and-amenity/part-f3-fire-safety",
      summary: "Fire ratings: walls to garage 30min FRL, smoke alarms all bedrooms + hallways, BAL ratings for bushfire zones."
    },
    "ceiling height": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-f-health-and-amenity/part-f2-room-heights",
      summary: "Minimum ceiling height: 2.4m for habitable rooms, 2.1m for non-habitable, bathrooms, laundries."
    },
    "stairs": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-d-access-and-egress/part-d2-construction-of-exits",
      summary: "Riser: 115-190mm, Going: min 250mm, Landing width: min stair width. Handrail height: 865-1000mm."
    },
    "ventilation": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-f-health-and-amenity/part-f4-light-and-ventilation",
      summary: "Natural ventilation: min 5% of floor area for habitable rooms. Mechanical alternatives allowed per AS1668."
    },
    "glazing": {
      url: "https://ncc.abcb.gov.au/editions/ncc-2022/adopted/volume-two/section-f-health-and-amenity/part-f6-safety-glazing",
      summary: "Safety glazing required within 2m of floor if pane >0.5m wide, doors, side panels. Use AS1288 compliant glass."
    }
  };

  const handleSearch = () => {
    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    
    // Find matching NCC section
    const match = Object.entries(nccSections).find(([key]) => 
      query.includes(key) || key.includes(query)
    );

    if (match) {
      const [_, data] = match;
      setSummary(data.summary);
      toast.success("NCC reference found");
    } else {
      setSummary("No specific NCC reference found. Try keywords like: footings, framing, spacing, insulation, waterproofing, fire, ceiling height, stairs, ventilation, glazing");
      toast.info("Try different keywords");
    }
    setIsSearching(false);
  };

  const openNccLink = () => {
    const query = searchQuery.toLowerCase();
    const match = Object.entries(nccSections).find(([key]) => 
      query.includes(key) || key.includes(query)
    );
    
    if (match) {
      window.open(match[1].url, '_blank', 'noopener,noreferrer');
      toast.success("Opening NCC reference in new tab");
    } else {
      window.open('https://ncc.abcb.gov.au/', '_blank', 'noopener,noreferrer');
      toast.info("Opening NCC main website");
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-display text-xl font-bold mb-4">NCC Standards Research</h3>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search NCC standards (e.g., footings, framing, spacing, insulation...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        <Button onClick={openNccLink} variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Open NCC
        </Button>
      </div>
      
      {summary && (
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">NCC Summary:</h4>
          <p className="text-sm">{summary}</p>
        </div>
      )}
    </Card>
  );
};
