import React, { FunctionComponent, HTMLAttributes } from 'react';
import classNames from '../../lib/classNames';
import { getClassName } from '../../helpers/getClassName';
import usePlatform from '../../hooks/usePlatform';

export interface CardGridProps extends HTMLAttributes<HTMLDivElement> {
  size: 's' | 'm' | 'l';
}

const CardGrid: FunctionComponent<CardGridProps> = ({ children, className, size, ...restProps }: CardGridProps) => {
  const platform = usePlatform();

  return (
    <div
      {...restProps}
      className={classNames(getClassName('CardGrid', platform), `CardGrid--${size}`, className)}
    >
      {children}
    </div>
  );
};

export default CardGrid;
