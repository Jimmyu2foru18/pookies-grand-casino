import React from 'react';
import { CardData, Suit } from '../types';
import { getCardColor } from '../services/cardLogic';
import { useDraggable } from '@dnd-kit/core';
import { CARD_BACK_IMAGE, getCardFaceImage } from '../constants';

interface CardProps {
  card: CardData;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  selected?: boolean;
  isDraggable?: boolean;
  forceOpacity?: number; // For stack hiding
}

const Card: React.FC<CardProps> = ({ 
  card, 
  className = '', 
  onClick, 
  onDoubleClick, 
  selected, 
  isDraggable = false,
  forceOpacity
}) => {
  // DnD Hook
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
    disabled: !isDraggable || !card.isFaceUp
  });

  const style: React.CSSProperties | undefined = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 9999,
  } : undefined;

  const opacityClass = isDragging ? 'opacity-0' : (forceOpacity !== undefined ? `opacity-${forceOpacity}` : 'opacity-100');

  const cardTextColor = getCardColor(card.suit);
  const isRedSuit = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
  const rankBackingClass = isRedSuit
    ? 'bg-pookie-blue/100 shadow-[0_0_26px_rgba(0,0,0,1)]'
    : 'bg-pookie-pink/100 shadow-[0_0_26px_rgba(0,0,0,1)]';
  const suitBackingClass = isRedSuit
    ? 'bg-pookie-blue/100 shadow-[0_0_26px_rgba(0,0,0,1)]'
    : 'bg-pookie-blue/100 shadow-[0_0_26px_rgba(0,0,0,1)]';

  const getSuitIcon = (suit: Suit) => suit;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners} 
      {...attributes}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative w-24 h-36 rounded-xl shadow-[0_0_42px_rgba(236,72,153,0.78)] flex flex-col justify-between p-2 select-none 
        ${card.isFaceUp ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer bg-pookie-black'} 
        ${card.isFaceUp ? getCardColor(card.suit) : ''} 
        ${className} 
        ${selected ? 'ring-10 ring-pookie-pink -translate-y-8' : ''}
        ${opacityClass}
        transition-all duration-200 border border-gray-900/10 overflow-hidden
      `}
    >
      {/* Card background */}
      <div className="absolute inset-0 z-0">
        <img 
          src={card.isFaceUp ? getCardFaceImage(card.rank) : CARD_BACK_IMAGE} 
          alt="card bg" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Card front */}
      {card.isFaceUp ? (
        <>
          <div className="relative z-10 text-left leading-none">
            <div className="relative inline-block">
              <div className={`absolute inset-0 rounded-full -z-10 ${rankBackingClass}`}></div>
              <div className={`text-lg font-bold ${cardTextColor}`}>{card.rank}</div>
            </div>

            <div className="relative w-max mt-1">
              <div className={`absolute inset-0 rounded-full -z-10 ${suitBackingClass}`}></div>
              <span 
                className={`relative text-xl font-bold ${cardTextColor}`}
              >
                {getSuitIcon(card.suit)}
              </span>
            </div>
          </div>

          <div className="relative z-10 text-right leading-none transform rotate-180">
            <div className="relative inline-block">
              <div className={`absolute inset-0 rounded-full -z-10 ${rankBackingClass}`}></div>
              <div className={`text-lg font-bold ${cardTextColor}`}>{card.rank}</div>
            </div>

            <div className="relative w-max mt-1">
              <div className={`absolute inset-0 rounded-full -z-10 ${suitBackingClass}`}></div>
              <span 
                className={`relative text-xl font-bold ${cardTextColor}`}
              >
                {getSuitIcon(card.suit)}
              </span>
            </div>
          </div>
        </>
      ) : (
        // Card back hover effect
        <div className="relative z-10 w-full h-full flex items-center justify-center opacity-0 hover:opacity-10 transition-opacity">
          <span className="text-white font-serif font-bold rotate-25 text-xl tracking-widest">POOKIE</span>
        </div>
      )}
    </div>
  );
};

export default Card;
