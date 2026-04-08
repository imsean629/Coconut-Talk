import { Announcement } from '../types';

export const loungeAnnouncements: Announcement[] = [
  {
    id: 'notice-1',
    title: '실시간 MVP 안내',
    body: '코코넛톡은 Socket.IO 릴레이 서버를 통해 여러 클라이언트가 동시에 같은 방을 공유할 수 있어요.',
  },
  {
    id: 'notice-2',
    title: '로컬 기록 보관',
    body: '메시지는 서버에 저장되지 않고, 각 클라이언트의 SQLite에만 남아요.',
  },
];

export const loungeFeed = [
  '같은 서버에 접속한 사용자끼리 접속 상태와 대화방이 실시간으로 업데이트돼요.',
  '서버가 재시작되면 방은 초기화되지만, 내 기기에 저장된 대화 기록은 그대로 남아요.',
  '메시지 전송 상태와 연결 상태를 화면에서 바로 확인할 수 있어요.',
];
