// story.txtファイルをパースしてビジュアルノベル用のデータに変換
export interface DialogueLine {
  speaker?: string | string[];
  text: string;
  character?: string;
  background?: string; // 背景を各dialogueで指定可能に
  characters?: string[]; // 画面に表示するキャラクター配列
  voice?: string[]; // ボイスファイルのパス配列
}

export interface Scene {
  title: string;
  dialogues: DialogueLine[];
  background?: string;
  segments?: { start: number; background: string }[];
}

export function parseStory(storyText: string): Scene[] {
  const scenes: Scene[] = [];
  const lines = storyText.split('\n');
  
  let currentScene: Scene | null = null;
  let currentDialogues: DialogueLine[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 空行はスキップ
    if (!line) continue;
    
    // シーンタイトル（## で始まる行）
    if (line.startsWith('## ')) {
      // 前のシーンを保存
      if (currentScene) {
        currentScene.dialogues = currentDialogues;
        scenes.push(currentScene);
      }
      
      // 新しいシーンを開始
      currentScene = {
        title: line.replace('## ', ''),
        dialogues: []
      };
      currentDialogues = [];
      continue;
    }
    
    // メインタイトル（# で始まる行）は最初のシーンとして扱う
    if (line.startsWith('# ')) {
      if (currentScene) {
        currentScene.dialogues = currentDialogues;
        scenes.push(currentScene);
      }
      
      currentScene = {
        title: line.replace('# ', ''),
        dialogues: []
      };
      currentDialogues = [];
      continue;
    }
    
    // セパレーター
    if (line.startsWith('-----')) {
      continue;
    }
    
    // 台詞として処理（「」で囲まれた文）
    if (line.includes('「') && line.includes('」')) {
      const dialogue: DialogueLine = {
        text: line
      };
      
      // 話者を推測（前の文脈から）
      if (line.includes('太郎')) {
        dialogue.speaker = '太郎';
      } else if (line.includes('彁')) {
        dialogue.speaker = '彁';
      }
      
      currentDialogues.push(dialogue);
    } else if (line && !line.startsWith('#')) {
      // 地の文
      currentDialogues.push({
        text: line
      });
    }
  }
  
  // 最後のシーンを保存
  if (currentScene) {
    currentScene.dialogues = currentDialogues;
    scenes.push(currentScene);
  }
  
  return scenes;
}

// story.txtを読み込む
export async function loadStory(): Promise<Scene[]> {
  try {
    const response = await fetch('/story.json');
    const book = await response.json();
    // book.chapters の形式を Scene[] にマップ
    if (!book || !book.chapters) return [];
    const scenes: Scene[] = book.chapters.map((c: any) => ({
      title: c.title || '',
      dialogues: (c.dialogues || []).map((d: any) => {
        let speaker = d.speaker;
        // normalize combined speaker strings like "彁太郎" into ["彁","太郎"]
        if (!Array.isArray(speaker) && typeof speaker === 'string') {
          const s: string = speaker;
          if (s.includes('彁') && s.includes('太郎')) {
            speaker = ['彁', '太郎'];
          }
        }
        return { 
          speaker, 
          text: d.text,
          background: d.background,
          characters: d.characters,
          voice: d.voice
        };
      })
    }));
    return scenes;
  } catch (error) {
    console.error('Failed to load story.json:', error);
    return [];
  }
}
