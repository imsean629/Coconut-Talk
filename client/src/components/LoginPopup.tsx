import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { MinusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { FormEvent, useState } from 'react';
import { characterVariants } from '../utils/characters';
import { Avatar } from './ui/Avatar';
import { BrandMark } from './ui/BrandMark';

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

  const connectionLabel =
    connectionState === 'connecting' ? '연결 중' : connectionState === 'connected' ? '연결됨' : '연결 안 됨';

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-transparent p-3">
      <div className="w-full max-w-[470px] rounded-[36px] border border-[#b6906b] bg-[linear-gradient(180deg,#dcc09b_0%,#caa57d_100%)] px-6 py-5 shadow-[0_22px_52px_rgba(84,56,38,0.18)]">
        <div className="app-no-drag mb-4 flex items-center justify-between">
          <div className="w-[88px]" />
          <div
            className="app-drag h-9 w-[480px] max-w-full rounded-full bg-[#ead7c1]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            title="여기를 잡고 창을 이동할 수 있어요"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="최소화"
              onClick={() => void window.coconutDesktop?.appWindow.minimizeCurrent()}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#caa27b] bg-[linear-gradient(180deg,#fbf0e1_0%,#ead3b7_100%)] text-[#5d3f30] shadow-[0_6px_16px_rgba(84,56,38,0.14)] transition hover:bg-[linear-gradient(180deg,#fff7ed_0%,#efdcc6_100%)]"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="닫기"
              onClick={() => void window.coconutDesktop?.appWindow.closeCurrent()}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#caa27b] bg-[linear-gradient(180deg,#fbf0e1_0%,#ead3b7_100%)] text-[#5d3f30] shadow-[0_6px_16px_rgba(84,56,38,0.14)] transition hover:bg-[linear-gradient(180deg,#fff7ed_0%,#efdcc6_100%)]"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-[28px] border border-[#f1dcc1] bg-[linear-gradient(180deg,#fffaf3_0%,#f7ead7_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_24px_rgba(103,70,47,0.08)]">
          <div className="flex items-center justify-center gap-4 text-center">
            <BrandMark compact iconOnly />
            <div>
              <h1 className="text-[2.35rem] font-semibold tracking-[-0.04em] leading-none text-coconut-ink">Coconut Talk</h1>
              <p className="mt-1 text-sm text-coconut-shell/75">트로피컬 메신저</p>
            </div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="text-center">
            <div className="inline-flex rounded-full bg-[#6a4a36]/8 px-3 py-1 text-xs font-medium text-coconut-shell">
              서버 상태: {connectionLabel}
            </div>
          </div>
          <div>
            <span className="mb-3 block text-sm font-medium text-coconut-shell">캐릭터 선택</span>
            <div className="grid grid-cols-5 justify-items-center gap-3">
              {characterVariants.map((variant) => {
                const active = selectedCharacter === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedCharacter(variant.id)}
                    className={`flex w-full max-w-[78px] flex-col items-center rounded-[24px] border px-2 py-3 transition ${
                      active
                        ? 'border-[#6f4c3a] bg-[#fff1de] shadow-[0_10px_24px_rgba(111,76,58,0.14)]'
                        : 'border-[#ead8c2] bg-[#fffaf4] hover:bg-white'
                    }`}
                  >
                    <Avatar name={variant.name} color={variant.ring} seed={variant.id} size="md" />
                    <p className="mt-2 text-xs font-medium text-coconut-shell">{variant.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-coconut-shell">닉네임</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="예: 코코넛션"
              className="w-full rounded-[22px] border border-[#e3ccb3] bg-[#fffaf4] px-4 py-3.5 text-coconut-ink outline-none transition focus:border-[#8c684f] focus:ring-4 focus:ring-[#8c684f]/10"
            />
          </label>

          <div className="rounded-[24px] border border-[#e3ccb3] bg-[#fffaf4] px-4 py-3">
            <button
              type="button"
              onClick={() => setShowServerOptions((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-coconut-shell"
            >
              <span>서버 주소 설정</span>
              <span className="flex items-center gap-2 text-xs text-coconut-shell/70">
                <span className="max-w-[220px] truncate">{serverUrl}</span>
                <ChevronDownIcon className={`h-4 w-4 transition ${showServerOptions ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {showServerOptions && (
              <div className="mt-3 border-t border-[#ead8c7] pt-3">
                <input
                  value={serverUrl}
                  onChange={(event) => setServerUrl(event.target.value)}
                  placeholder="예: https://coconut-talk-relay.onrender.com"
                  className="w-full rounded-[20px] border border-[#e3ccb3] bg-white px-4 py-3 text-coconut-ink outline-none transition focus:border-[#8c684f] focus:ring-4 focus:ring-[#8c684f]/10"
                />
                <p className="mt-2 text-xs text-coconut-shell/65">
                  기본값은 `https://coconut-talk-relay.onrender.com` 이에요.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!nickname.trim() || !serverUrl.trim()}
            className="w-full rounded-[24px] bg-[linear-gradient(180deg,#765541_0%,#624432_100%)] px-4 py-3.5 font-semibold text-[#fff8ef] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(98,68,50,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            코코넛톡 입장하기
          </button>
        </form>
      </div>
    </div>
  );
}
