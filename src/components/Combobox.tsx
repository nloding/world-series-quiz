import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Option = { value: string; label: string };

type SingleProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  multiple?: false;
};

type MultiProps = {
  options: Option[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  multiple: true;
};

type Props = SingleProps | MultiProps;

export function Combobox(props: Props) {
  const {
    options,
    placeholder = "Select...",
    emptyMessage = "No match.",
  } = props;
  const [open, setOpen] = useState(false);

  const isMulti = props.multiple === true;
  const selectedValues = isMulti ? props.values : props.value ? [props.value] : [];
  const triggerLabel = isMulti
    ? options
        .filter((o) => selectedValues.includes(o.value))
        .map((o) => o.label)
        .join(", ")
    : options.find((o) => o.value === props.value)?.label ?? "";

  const toggle = (v: string) => {
    if (isMulti) {
      const next = selectedValues.includes(v)
        ? selectedValues.filter((x) => x !== v)
        : [...selectedValues, v];
      props.onValuesChange(next);
    } else {
      props.onChange(v);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={props.disabled}
          className="w-full justify-between font-normal h-auto min-h-9 py-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            className={cn(
              "truncate text-left",
              !triggerLabel && "text-muted-foreground",
            )}
          >
            {triggerLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        checked ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
