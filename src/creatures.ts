export type CreatureId = "mossling" | "pufflet" | "glimmer";
export type CreatureDefinition = {
  id: CreatureId;
  name: string;
  description: string;
  color: number;
  accent: number;
  icon: string;
};

export const CREATURES: readonly CreatureDefinition[] = [
  { id: "mossling", name: "こけまる", description: "しっとりした森がだいすき。ゆっくりぴょんぴょん進む。", color: 0x9ddc75, accent: 0x5f9a54, icon: "🌱" },
  { id: "pufflet", name: "ふわりん", description: "綿毛のようにふわふわ。風が吹くと嬉しそうに揺れる。", color: 0xffd4db, accent: 0xf2a1b2, icon: "🌸" },
  { id: "glimmer", name: "きらぽん", description: "暗いところでやさしく光る。キラキラした石がお気に入り。", color: 0xfbe28a, accent: 0xe7b85a, icon: "✨" },
];

export function findCreature(id: string): CreatureDefinition | undefined {
  return CREATURES.find((creature) => creature.id === id);
}
