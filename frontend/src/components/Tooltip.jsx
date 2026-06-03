import * as TooltipRadix from '@radix-ui/react-tooltip';

export function Tooltip({ children, content, side = 'top' }) {
  return (
    <TooltipRadix.Provider delayDuration={200}>
      <TooltipRadix.Root>
        <TooltipRadix.Trigger asChild>
          {children}
        </TooltipRadix.Trigger>
        <TooltipRadix.Portal>
          <TooltipRadix.Content
            className="bg-gray-900 text-white text-xs rounded px-2 py-1 max-w-xs z-50"
            sideOffset={5}
            side={side}
          >
            {content}
            <TooltipRadix.Arrow className="fill-gray-900" />
          </TooltipRadix.Content>
        </TooltipRadix.Portal>
      </TooltipRadix.Root>
    </TooltipRadix.Provider>
  );
}