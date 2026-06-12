import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });

  it('applies primary variant styles by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-primary-500');
  });

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-gray-100');
  });

  it('applies outline variant styles', () => {
    render(<Button variant="outline">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('border-primary-500');
  });

  it('applies different sizes', () => {
    const { rerender } = render(<Button size="sm">Click me</Button>);
    expect(screen.getByRole('button').className).toContain('px-3');

    rerender(<Button size="lg">Click me</Button>);
    expect(screen.getByRole('button').className).toContain('px-6');
  });
});
