import React from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu';

interface MultiSelectProps {
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select...", disabled }: MultiSelectProps) {
  const toggleItem = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectedItems = options.filter(o => selected.includes(o.id));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between min-h-[40px] h-auto py-2"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {selectedItems.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedItems.map(item => (
                <Badge key={item.id} variant="secondary" className="mr-1">
                  {item.name}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer" 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(item.id);
                    }}
                  />
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {options.map(option => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => toggleItem(option.id)}
            className={selected.includes(option.id) ? 'bg-accent' : ''}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 border rounded ${selected.includes(option.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                {selected.includes(option.id) && <span className="text-primary-foreground text-xs flex items-center justify-center">✓</span>}
              </div>
              {option.name}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
