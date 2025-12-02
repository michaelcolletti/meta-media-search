import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import './IconButton.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
}

export function IconButton({
  variant = 'default',
  size = 'md',
  icon,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={clsx('icon-button', `icon-button--${variant}`, `icon-button--${size}`, className)}
      {...props}
    >
      {icon}
    </button>
  );
}
