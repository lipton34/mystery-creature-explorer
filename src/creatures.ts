export type CreatureId = "mossling" | "pufflet" | "glimmer" | "droplet" | "acorn";
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
  { id: "droplet", name: "しずくん", description: "雨あがりの水たまりが好き。元気にぷるぷるする。", color: 0x8acfe7, accent: 0x509dc5, icon: "💧" },
  { id: "acorn", name: "どんぐりん", description: "大きなどんぐり帽子がじまん。森のお散歩がだいすき。", color: 0xc7a278, accent: 0x87613e, icon: "🌰" },
];

export function findCreature(id: string): CreatureDefinition | undefined {
  return CREATURES.find((creature) => creature.id === id);
}
