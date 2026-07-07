import { SelectField } from '@/components/form/select-field';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const options = [
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'food', label: 'Food & Beverage' },
];

describe('SelectField', () => {
  beforeAll(() => {
    // jsdom does not implement pointer capture / scrollIntoView, which the
    // Radix Select primitive relies on when opening its listbox via userEvent.
    globalThis.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    globalThis.HTMLElement.prototype.releasePointerCapture = vi.fn();
    globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the placeholder when no value is selected', () => {
    render(
      <SelectField
        id="industry"
        value=""
        placeholder="Select..."
        options={options}
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('renders the label for the currently selected value', () => {
    render(
      <SelectField
        id="industry"
        value="food"
        placeholder="Select..."
        options={options}
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Food & Beverage')).toBeInTheDocument();
  });

  it('lists every option when opened', async () => {
    const user = userEvent.setup();
    render(
      <SelectField
        id="industry"
        value=""
        placeholder="Select..."
        options={options}
        onValueChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: 'Manufacturing' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Food & Beverage' })).toBeInTheDocument();
  });

  it('calls onValueChange with the selected option value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SelectField
        id="industry"
        value=""
        placeholder="Select..."
        options={options}
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Food & Beverage' }));

    expect(onValueChange).toHaveBeenCalledWith('food');
  });

  it('marks the trigger as aria-invalid when isInvalid is true', () => {
    render(
      <SelectField
        id="industry"
        value=""
        placeholder="Select..."
        options={options}
        onValueChange={vi.fn()}
        isInvalid
      />,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('calls onBlur when the trigger loses focus', () => {
    const onBlur = vi.fn();
    render(
      <SelectField
        id="industry"
        value=""
        placeholder="Select..."
        options={options}
        onValueChange={vi.fn()}
        onBlur={onBlur}
      />,
    );
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    trigger.blur();
    expect(onBlur).toHaveBeenCalledOnce();
  });
});
