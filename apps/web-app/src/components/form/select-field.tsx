import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectFieldOption {
  readonly value: string;
  readonly label: string;
}

interface SelectFieldProps {
  readonly id: string;
  readonly value: string;
  readonly placeholder: string;
  readonly options: readonly SelectFieldOption[];
  readonly onValueChange: (value: string) => void;
  readonly onBlur?: () => void;
  readonly isInvalid?: boolean;
}

export function SelectField({
  id,
  value,
  placeholder,
  options,
  onValueChange,
  onBlur,
  isInvalid = false,
}: SelectFieldProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} onBlur={onBlur} aria-invalid={isInvalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
