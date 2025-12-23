import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface CountItemConfig {
  name: string;
  category: string;
  notes: string;
}

interface CountNamingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: CountItemConfig) => void;
  onCancel: () => void;
}

const COUNT_CATEGORIES = [
  { value: 'fixtures', label: 'Fixtures (Toilets, Basins, etc.)' },
  { value: 'doors', label: 'Doors' },
  { value: 'windows', label: 'Windows' },
  { value: 'electrical', label: 'Electrical (GPOs, Switches, Lights)' },
  { value: 'plumbing', label: 'Plumbing (Taps, Floor Wastes)' },
  { value: 'mechanical', label: 'Mechanical (Vents, Diffusers)' },
  { value: 'fire', label: 'Fire Services (Detectors, Sprinklers)' },
  { value: 'access', label: 'Access (Manholes, Access Panels)' },
  { value: 'structural', label: 'Structural (Columns, Footings)' },
  { value: 'other', label: 'Other' },
];

const COMMON_ITEMS: Record<string, string[]> = {
  fixtures: ['Toilet', 'Basin', 'Shower', 'Bath', 'Urinal', 'Sink', 'Laundry Tub'],
  doors: ['Hinged Door', 'Sliding Door', 'Cavity Slider', 'Bi-fold Door', 'French Door', 'Fire Door', 'Access Door'],
  windows: ['Awning Window', 'Sliding Window', 'Fixed Window', 'Louvre Window', 'Skylight', 'Roof Window'],
  electrical: ['GPO Single', 'GPO Double', 'Light Switch', 'Dimmer', 'Downlight', 'Pendant', 'Wall Light', 'Exhaust Fan', 'Data Point'],
  plumbing: ['Floor Waste', 'Tap Set', 'Mixer Tap', 'Hose Cock', 'Gas Point', 'Hot Water Unit'],
  mechanical: ['Supply Diffuser', 'Return Air Grille', 'Exhaust Grille', 'AC Unit', 'Split System'],
  fire: ['Smoke Detector', 'Heat Detector', 'Sprinkler Head', 'Fire Extinguisher', 'Exit Sign', 'Emergency Light'],
  access: ['Manhole', 'Access Panel', 'Inspection Opening'],
  structural: ['Column', 'Pier', 'Footing', 'Beam'],
  other: ['Custom Item'],
};

export const CountNamingDialog: React.FC<CountNamingDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('fixtures');
  const [notes, setNotes] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setName(''); // Reset name when category changes
    setShowCustomInput(false);
  };

  const handleItemSelect = (item: string) => {
    if (item === 'Custom Item') {
      setShowCustomInput(true);
      setName('');
    } else {
      setShowCustomInput(false);
      setName(item);
    }
  };

  const handleConfirm = () => {
    if (!name.trim()) return;
    onConfirm({
      name: name.trim(),
      category,
      notes: notes.trim(),
    });
    // Reset form
    setName('');
    setCategory('fixtures');
    setNotes('');
    setShowCustomInput(false);
  };

  const handleCancel = () => {
    setName('');
    setCategory('fixtures');
    setNotes('');
    setShowCustomInput(false);
    onCancel();
  };

  const commonItems = COMMON_ITEMS[category] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>What are you counting?</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Category Selection */}
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {COUNT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Common Items Quick Select */}
          <div className="grid gap-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {commonItems.map((item) => (
                <Button
                  key={item}
                  variant={name === item ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleItemSelect(item)}
                  className="text-xs"
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Name Input */}
          {(showCustomInput || !commonItems.includes(name)) && (
            <div className="grid gap-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter item name..."
                autoFocus
              />
            </div>
          )}

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Start Counting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CountNamingDialog;
