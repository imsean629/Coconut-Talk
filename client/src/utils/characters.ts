export type CharacterVariant = {
  id: string;
  name: string;
  shell: string;
  face: string;
  leaf: string;
  blush: string;
  ring: string;
};

export const characterVariants: CharacterVariant[] = [
  { id: 'coconut', name: '코코넛', shell: '#7c5743', face: '#fff6ea', leaf: '#87c45b', blush: '#f6b4ac', ring: '#f2d8bf' },
  { id: 'apple', name: '사과', shell: '#d85b57', face: '#fff7ef', leaf: '#6caf62', blush: '#f7c1c1', ring: '#f7d8d6' },
  { id: 'banana', name: '바나나', shell: '#f3d35c', face: '#fff9dd', leaf: '#8bbf52', blush: '#f6c7b0', ring: '#f4e7ae' },
  { id: 'watermelon', name: '수박', shell: '#63b96c', face: '#fff6ef', leaf: '#4d8a47', blush: '#f4b0b7', ring: '#d7efd8' },
  { id: 'strawberry', name: '딸기', shell: '#ef6f86', face: '#fff4f7', leaf: '#7dbb63', blush: '#f8bcc8', ring: '#f7d8df' },
];

export const getCharacterVariant = (id: string) => characterVariants.find((variant) => variant.id === id) ?? characterVariants[0];
