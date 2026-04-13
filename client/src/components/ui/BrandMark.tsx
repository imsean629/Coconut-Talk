export function BrandMark({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      <div
        className={`relative flex ${compact ? 'h-11 w-11 rounded-[18px]' : 'h-14 w-14 rounded-[22px]'} items-center justify-center bg-[radial-gradient(circle_at_top,#9bd06f_0%,#7bb157_32%,#6b4b39_33%,#7c5743_100%)] shadow-soft ring-1 ring-[#f2d8bf]`}
      >
        <div className={`absolute ${compact ? 'top-1 h-3 w-6' : 'top-1.5 h-4 w-8'} rounded-b-full rounded-t-[999px] bg-[#87c45b]`} />
        <div className={`absolute ${compact ? 'top-0.5 h-4 w-2.5' : 'top-0.5 h-5 w-3'} -rotate-12 rounded-full bg-[#5f9d3f]`} />
        <div className={`absolute ${compact ? 'right-3 top-0.5 h-4 w-2.5' : 'right-4 top-0.5 h-5 w-3'} rotate-12 rounded-full bg-[#5f9d3f]`} />
        <div className={`absolute inset-x-0 ${compact ? 'top-[14px] gap-1.5' : 'top-[18px] gap-2'} flex justify-center`}>
          <div className={`flex ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} items-center justify-center rounded-full bg-[#fff6ea]`}>
            <div className={`${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} rounded-full bg-[#3c271d]`} />
          </div>
          <div className={`flex ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} items-center justify-center rounded-full bg-[#fff6ea]`}>
            <div className={`${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} rounded-full bg-[#3c271d]`} />
          </div>
        </div>
        <div className={`absolute ${compact ? 'top-[28px] h-1 w-5' : 'top-[35px] h-1.5 w-6'} rounded-full border-b-2 border-[#3c271d]`} />
        <div className={`absolute ${compact ? 'left-1.5 top-[24px] h-1.5 w-2.5' : 'left-2 top-[30px] h-2 w-3'} rounded-full bg-[#f6b4ac]/70 blur-[1px]`} />
        <div className={`absolute ${compact ? 'right-1.5 top-[24px] h-1.5 w-2.5' : 'right-2 top-[30px] h-2 w-3'} rounded-full bg-[#f6b4ac]/70 blur-[1px]`} />
      </div>
      {!iconOnly && !compact && (
        <div>
          <p className="text-[1.35rem] font-semibold tracking-tight text-coconut-ink">Coconut Talk</p>
          <p className="text-xs text-coconut-shell/70">포근한 커뮤니티를 위한 트로피컬 메신저</p>
        </div>
      )}
      {!iconOnly && compact && (
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[0.86rem] font-semibold tracking-tight text-coconut-ink">Coconut Talk</p>
          <p className="whitespace-nowrap text-[10.5px] font-semibold tracking-tight text-[#5f4333]">트로피컬 메신저</p>
        </div>
      )}
    </div>
  );
}
