import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { FormEvent, useState } from 'react';
import { characterVariants } from '../utils/characters';
import { BrandMark } from './ui/BrandMark';
import { Panel } from './ui/Panel';
import { Avatar } from './ui/Avatar';

type LoginPopupProps = {
  onLogin: (payload: { nickname: string; avatarVariant: string; serverUrl: string }) => void;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  initialServerUrl: string;
};

export function LoginPopup({ onLogin, connectionState, initialServerUrl }: LoginPopupProps) {
  const [nickname, setNickname] = useState('');
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [selectedCharacter, setSelectedCharacter] = useState(characterVariants[0].id);
  const [showServerOptions, setShowServerOptions] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!nickname.trim()) return;
    onLogin({ nickname: nickname.trim(), avatarVariant: selectedCharacter, serverUrl: serverUrl.trim() });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-tropical px-6 py-8">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#ffe7d2]/60 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#dff1d5]/70 blur-3xl" />
      <div className="absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full bg-white/35 blur-2xl" />
      <Panel className="relative w-full max-w-[470px] rounded-[38px] border-[#fff7ef] bg-white/86 p-8 shadow-float">
        <div className="mb-6 flex justify-center"><BrandMark /></div>
        <div className="mb-6 rounded-[30px] bg-gradient-to-br from-[#fff4e6] via-[#fffaf4] to-[#fff0f4] p-5 text-center ring-1 ring-[#f4e4cf]"><p className="text-sm font-semibold text-coconut-shell">귀엽고 포근한 커뮤니티 메신저</p><p className="mt-2 text-sm leading-6 text-coconut-shell/75">닉네임과 캐릭터를 고르고 필요하면 서버 주소를 바꿔 바로 코코넛톡에 입장할 수 있어요.</p><p className="mt-3 text-xs text-coconut-shell/65">서버 상태: {connectionState === 'connecting' ? '연결 중' : connectionState === 'connected' ? '연결됨' : '연결 안 됨'}</p></div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <span className="mb-3 block text-sm font-medium text-coconut-shell">캐릭터 선택</span>
            <div className="grid grid-cols-5 gap-3">
              {characterVariants.map((variant) => {
                const active = selectedCharacter === variant.id;
                return (
                  <button key={variant.id} type="button" onClick={() => setSelectedCharacter(variant.id)} className={`rounded-[22px] border p-2 transition ${active ? 'border-coconut-shell bg-[#fff3e5] shadow-soft' : 'border-[#efd8bf] bg-white hover:bg-[#fff7ef]'}`}>
                    <Avatar name={variant.name} color={variant.ring} seed={variant.id} size="md" />
                    <p className="mt-2 text-xs font-medium text-coconut-shell">{variant.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-coconut-shell">닉네임</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="예: 코코넛션" className="w-full rounded-[22px] border border-[#efd8bf] bg-[#fffdf9] px-4 py-3.5 text-coconut-ink outline-none transition focus:border-coconut-palm focus:ring-4 focus:ring-coconut-palm/10" />
          </label>
          <div className="rounded-[24px] border border-[#efd8bf] bg-[#fffaf5] px-4 py-3 ring-1 ring-[#f4e4cf]/60">
            <button type="button" onClick={() => setShowServerOptions((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-coconut-shell">
              <span>서버 주소 설정</span>
              <span className="flex items-center gap-2 text-xs text-coconut-shell/70">
                <span className="truncate max-w-[220px]">{serverUrl}</span>
                <ChevronDownIcon className={`h-4 w-4 transition ${showServerOptions ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {showServerOptions && (
              <div className="mt-3 border-t border-[#f0dfcb] pt-3">
                <input value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} placeholder="예: http://192.168.0.10:3030" className="w-full rounded-[20px] border border-[#efd8bf] bg-white px-4 py-3 text-coconut-ink outline-none transition focus:border-coconut-palm focus:ring-4 focus:ring-coconut-palm/10" />
                <p className="mt-2 text-xs text-coconut-shell/65">기본값은 로컬 서버 `127.0.0.1:3030` 이에요.</p>
              </div>
            )}
          </div>
          <button type="submit" disabled={!nickname.trim() || !serverUrl.trim()} className="w-full rounded-[24px] bg-gradient-to-r from-coconut-shell to-coconut-bark px-4 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50">코코넛톡 입장하기</button>
        </form>
      </Panel>
    </div>
  );
}
