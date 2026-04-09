import { ArrowRightOnRectangleIcon, ChatBubbleBottomCenterTextIcon, ExclamationTriangleIcon, KeyIcon, LockClosedIcon, PlusCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Panel } from '../components/ui/Panel';
import { AppRoom, AppUser, LostRoom, SessionProfile } from '../types';
import { formatDateTime } from '../utils/format';

export function RoomsPage({
  rooms,
  lostRooms,
  users,
  session,
  unreadByRoom,
  onCreateRoom,
  onEnterRoom,
  onLeaveRoom,
}: {
  rooms: AppRoom[];
  lostRooms: LostRoom[];
  users: AppUser[];
  session: SessionProfile;
  unreadByRoom: Record<string, number>;
  onCreateRoom: () => void;
  onEnterRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
}) {
  const joinedRooms = rooms.filter((room) => room.participantIds.includes(session.clientId));
  const joinedLostRooms = lostRooms.filter((room) => room.participantIds.includes(session.clientId));

  return (
    <div className="min-h-full space-y-4">
      <Panel>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-coconut-ink">대화방</h1>
            <p className="text-sm text-coconut-shell/75">내가 들어가 있는 대화방만 보여줘요.</p>
          </div>
          <button type="button" onClick={onCreateRoom} className="flex items-center justify-center gap-2 rounded-[20px] bg-gradient-to-r from-coconut-shell to-coconut-bark px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-soft">
            <PlusCircleIcon className="h-5 w-5" />방 만들기
          </button>
        </div>

        <div className="space-y-3">
          {joinedRooms.map((room) => {
            const creator = users.find((user) => user.clientId === room.createdBy);

            return (
              <div key={room.id} className="rounded-[24px] border border-[#efdcc8] bg-[#fffaf5] px-4 py-4 transition hover:border-coconut-palm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <button type="button" onClick={() => onEnterRoom(room.id)} className="flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-coconut-ink">{room.title}</p>
                      {(unreadByRoom[room.id] ?? 0) > 0 && (
                        <span className="rounded-full bg-[#ffe0df] px-2.5 py-1 text-xs font-semibold text-rose-700">
                          새 메시지 {unreadByRoom[room.id]}
                        </span>
                      )}
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${room.type === 'public' ? 'bg-[#e6f2dc] text-coconut-shell' : 'bg-coconut-shell text-white'}`}>
                        {room.type === 'public' ? '공개방' : '비공개방'}
                      </span>
                      {room.hasPassword && <span className="rounded-full bg-[#fff0df] px-3 py-1 text-xs font-medium text-coconut-shell">비밀번호</span>}
                    </div>
                    <p className="mt-2 text-sm text-coconut-shell/75">{room.description || '실시간으로 바로 대화할 수 있는 방이에요.'}</p>
                  </button>
                  <div className="flex items-center gap-2 self-start">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-coconut-shell">{room.participantIds.length}명</span>
                    <button type="button" onClick={() => onLeaveRoom(room.id)} className="inline-flex items-center gap-1.5 rounded-full border border-[#efd8bf] bg-white px-3 py-1.5 text-xs font-medium text-coconut-shell transition hover:bg-[#fff0e0]">
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />나가기
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => onEnterRoom(room.id)} className="mt-4 flex w-full flex-wrap gap-4 text-left text-sm text-coconut-shell/70">
                  <span className="flex items-center gap-2">
                    {room.type === 'public' ? <ChatBubbleBottomCenterTextIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />}
                    {room.type === 'public' ? '바로 입장 가능' : '이미 입장한 비공개방'}
                  </span>
                  {room.hasPassword && (
                    <span className="flex items-center gap-2">
                      <KeyIcon className="h-4 w-4" />최초 입장 후 다시 입력하지 않아요
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <UserGroupIcon className="h-4 w-4" />참여자 {room.participantIds.length}명
                  </span>
                  <span>방장 {creator?.nickname ?? '알 수 없음'}</span>
                  <span>{formatDateTime(room.createdAt)}</span>
                </button>
              </div>
            );
          })}

          {joinedRooms.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[#efdcc8] bg-[#fffaf5] px-4 py-10 text-center text-sm text-coconut-shell/70">
              아직 참여 중인 대화방이 없어요. 라운지에서 방에 들어가거나 새 방을 만들어보세요.
            </div>
          )}
        </div>

        {joinedLostRooms.length > 0 && (
          <div className="mt-6 rounded-[24px] border border-[#f2d3da] bg-[#fff1f4] p-4">
            <div className="mb-3 flex items-center gap-2 text-rose-700">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <p className="font-semibold">서버 재시작으로 사라진 내 대화방</p>
            </div>
            <div className="space-y-2">
              {joinedLostRooms.map((room) => (
                <button key={room.id} type="button" onClick={() => onEnterRoom(room.id)} className="w-full rounded-[18px] bg-white/70 px-4 py-3 text-left">
                  <p className="font-medium text-coconut-ink">{room.title}</p>
                  <p className="mt-1 text-xs text-coconut-shell/70">로컬 기록은 남아 있지만 현재 서버에는 존재하지 않아요.</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
