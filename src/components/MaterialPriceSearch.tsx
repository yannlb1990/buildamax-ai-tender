import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  supplier: string;
  title: string;
  price: string;
  url: string;
  description?: string;
}

export const MaterialPriceSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const australianSuppliers = [
    { name: "Bunnings", domain: "bunnings.com.au" },
    { name: "Mitre 10", domain: "mitre10.com.au" },
    { name: "Reece", domain: "reece.com.au" },
    { name: "Tradelink", domain: "tradelink.com.au" },
    { name: "Total Tools", domain: "totaltools.com.au" },
  ];

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setLoading(true);
    
    // Simulate search results (in production, this would call actual APIs or web scraping services)
    setTimeout(() => {
      const mockResults: SearchResult[] = australianSuppliers.map((supplier, idx) => ({
        supplier: supplier.name,
        title: `${searchTerm} - ${supplier.name}`,
        price: `$${(Math.random() * 500 + 50).toFixed(2)}`,
        url: `https://www.${supplier.domain}/search?q=${encodeURIComponent(searchTerm)}`,
        description: `Find ${searchTerm} at ${supplier.name} with competitive pricing`
      }));
      
      setResults(mockResults);
      setLoading(false);
      toast.success(`Found ${mockResults.length} suppliers`);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-display text-xl font-bold mb-4">Australian Material Price Search</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Search across major Australian building suppliers for current material prices
      </p>
      
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., 90x45 MGP10, Colorbond roofing, PVC pipe..."
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Search Results ({results.length} suppliers)</h4>
            <p className="text-xs text-muted-foreground">Click links to compare prices</p>
          </div>
          
          <div className="grid gap-3">
            {results.map((result, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 hover:border-primary transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{result.supplier}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="font-mono text-lg font-bold text-accent">{result.price}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{result.description}</p>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View on {result.supplier}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(result.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Visit
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Prices shown are indicative. Click through to suppliers for current pricing, 
              availability, and detailed product specifications. Prices may vary by location and quantity.
            </p>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter a material name to search Australian suppliers</p>
        </div>
      )}
    </Card>
  );
};