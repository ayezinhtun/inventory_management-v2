import React, { useEffect, useState, Component } from 'react';
import { useStore } from '../../store/useStore';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator } from
'../ui/Command';
import { Dialog, DialogContent } from '../ui/Dialog';
import { Server, Cpu, FileText, Wrench, ArrowRightLeft } from 'lucide-react';
export function CommandSearch() {
  const {
    commandOpen,
    setCommandOpen,
    inventory,
    components,
    inventoryRequests,
    installRequests,
    relocationRequests,
    navigate
  } = useStore();
  const [query, setQuery] = useState('');
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandOpen, setCommandOpen]);
  const handleSelect = (page: any, id: string) => {
    setCommandOpen(false);
    navigate(page, id);
  };
  const q = query.toLowerCase();
  const filteredInventory = q ?
  inventory.
  filter(
    (i) =>
    !i.is_deleted && (
    i.item_name.toLowerCase().includes(q) ||
    i.serial_number.toLowerCase().includes(q))
  ).
  slice(0, 5) :
  [];
  const filteredComponents = q ?
  components.
  filter(
    (c) =>
    !c.is_deleted && (
    c.item_name.toLowerCase().includes(q) ||
    c.part_number.toLowerCase().includes(q))
  ).
  slice(0, 5) :
  [];
  const filteredRequests = q ?
  [
  ...inventoryRequests.map((r) => ({
    ...r,
    type: 'inventory' as const
  })),
  ...installRequests.map((r) => ({
    ...r,
    type: 'install' as const
  })),
  ...relocationRequests.map((r) => ({
    ...r,
    type: 'relocation' as const
  }))].

  filter((r) => r.request_number.toLowerCase().includes(q)).
  slice(0, 5) :
  [];
  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent
        className="overflow-hidden p-0 shadow-lg max-w-lg"
        showCloseButton={false}>
        
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput
            placeholder="Type a command or search..."
            value={query}
            onValueChange={setQuery} />
          
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No results found.</CommandEmpty>

            {filteredInventory.length > 0 &&
            <CommandGroup heading="Inventory">
                {filteredInventory.map((item) =>
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect('inventory-detail', item.id)}>
                
                    <Server className="mr-2 h-4 w-4" />
                    <span>{item.item_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {item.serial_number}
                    </span>
                  </CommandItem>
              )}
              </CommandGroup>
            }

            {filteredInventory.length > 0 && filteredComponents.length > 0 &&
            <CommandSeparator />
            }

            {filteredComponents.length > 0 &&
            <CommandGroup heading="Components">
                {filteredComponents.map((comp) =>
              <CommandItem
                key={comp.id}
                onSelect={() => handleSelect('component-detail', comp.id)}>
                
                    <Cpu className="mr-2 h-4 w-4" />
                    <span>{comp.item_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {comp.part_number}
                    </span>
                  </CommandItem>
              )}
              </CommandGroup>
            }

            {(filteredInventory.length > 0 || filteredComponents.length > 0) &&
            filteredRequests.length > 0 && <CommandSeparator />}

            {filteredRequests.length > 0 &&
            <CommandGroup heading="Requests">
                {filteredRequests.map((req) =>
              <CommandItem
                key={req.id}
                onSelect={() => {
                  if (req.type === 'inventory')
                  handleSelect('inventory-requests', req.id);else
                  if (req.type === 'install')
                  handleSelect('install-requests', req.id);else
                  handleSelect('relocation-requests', req.id);
                }}>
                
                    {req.type === 'inventory' &&
                <FileText className="mr-2 h-4 w-4" />
                }
                    {req.type === 'install' &&
                <Wrench className="mr-2 h-4 w-4" />
                }
                    {req.type === 'relocation' &&
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                }
                    <span>{req.request_number}</span>
                  </CommandItem>
              )}
              </CommandGroup>
            }
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>);

}