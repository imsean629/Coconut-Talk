import { getInitials } from '../../utils/format';
import { getCharacterVariant } from '../../utils/characters';

type AvatarProps = {
  name: string;
  color: string;
  seed?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

const sizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-10 w-10 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-14 w-14 text-base',
};

export function Avatar({ name, color, seed, size = 'md' }: AvatarProps) {
  const variant = seed ? getCharacterVariant(seed) : null;

  if (variant) {
    const isBanana = variant.id === 'banana';
    return (
      <div className={`relative flex ${sizes[size]} items-center justify-center rounded-2xl shadow-soft`} style={{ backgroundColor: variant.ring }}>
        <div className={`relative flex items-center justify-center ${isBanana ? 'h-[84%] w-[62%] rounded-[999px]' : 'h-[82%] w-[82%] rounded-[18px]'}`} style={{ backgroundColor: variant.shell }}>
          <div className={`absolute ${isBanana ? 'top-[6%] h-[14%] w-[20%] rounded-full' : 'top-[8%] h-[22%] w-[44%] rounded-b-full rounded-t-[999px]'}`} style={{ backgroundColor: variant.leaf }} />
          {!isBanana && (
            <>
              <div className="absolute left-[24%] top-[24%] h-[20%] w-[20%] rounded-full" style={{ backgroundColor: variant.face }} />
              <div className="absolute right-[24%] top-[24%] h-[20%] w-[20%] rounded-full" style={{ backgroundColor: variant.face }} />
              <div className="absolute left-[30%] top-[30%] h-[8%] w-[8%] rounded-full bg-[#3c271d]" />
              <div className="absolute right-[30%] top-[30%] h-[8%] w-[8%] rounded-full bg-[#3c271d]" />
              <div className="absolute top-[56%] h-[10%] w-[28%] rounded-full border-b-2 border-[#3c271d]" />
            </>
          )}
          {isBanana && (
            <>
              <div className="absolute left-[18%] top-[26%] h-[16%] w-[16%] rounded-full bg-[#fff7ef]" />
              <div className="absolute right-[18%] top-[26%] h-[16%] w-[16%] rounded-full bg-[#fff7ef]" />
              <div className="absolute left-[24%] top-[31%] h-[6%] w-[6%] rounded-full bg-[#3c271d]" />
              <div className="absolute right-[24%] top-[31%] h-[6%] w-[6%] rounded-full bg-[#3c271d]" />
              <div className="absolute top-[58%] h-[8%] w-[24%] rounded-full border-b-2 border-[#3c271d]" />
            </>
          )}
          <div className={`absolute ${isBanana ? 'left-[10%] top-[48%] h-[8%] w-[14%]' : 'left-[16%] top-[48%] h-[10%] w-[16%]'} rounded-full opacity-70 blur-[1px]`} style={{ backgroundColor: variant.blush }} />
          <div className={`absolute ${isBanana ? 'right-[10%] top-[48%] h-[8%] w-[14%]' : 'right-[16%] top-[48%] h-[10%] w-[16%]'} rounded-full opacity-70 blur-[1px]`} style={{ backgroundColor: variant.blush }} />
          {variant.id === 'strawberry' && <div className="absolute inset-x-[24%] top-[16%] flex justify-between"><span className="h-[6%] w-[6%] rounded-full bg-[#ffd86f]" /><span className="h-[6%] w-[6%] rounded-full bg-[#ffd86f]" /><span className="h-[6%] w-[6%] rounded-full bg-[#ffd86f]" /></div>}
          {variant.id === 'watermelon' && <div className="absolute inset-y-[18%] left-[8%] w-[10%] rounded-full bg-[#2d5f33]/30" />}
          {variant.id === 'apple' && <div className="absolute top-[10%] right-[18%] h-[12%] w-[10%] rounded-full bg-[#fff2f2]/50" />}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${sizes[size]} items-center justify-center rounded-2xl border border-white/70 font-semibold text-coconut-ink shadow-soft`} style={{ backgroundColor: color }}>
      {seed ?? getInitials(name)}
    </div>
  );
}
