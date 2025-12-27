import { GoogleGenAI } from "@google/genai";
import { Match, Player } from "../types";

const getPlayerNames = (ids: string[], players: Player[]) => {
  return ids.map(id => players.find(p => p.id === id)?.name || 'Unknown').join(' & ');
};

export const generateMatchCommentary = async (match: Match, allPlayers: Player[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("No API Key found for commentary");
      return "Match completed successfully.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const teamANames = getPlayerNames(match.teamAIds, allPlayers);
    const teamBNames = getPlayerNames(match.teamBIds, allPlayers);
    const winner = match.winnerTeam === 'A' ? teamANames : teamBNames;
    
    const scoreSummary = match.sets.map(s => `${s.teamAScore}-${s.teamBScore}`).join(', ');

    const prompt = `
      Write a short, exciting, 2-sentence sports commentary for a table tennis match.
      Format: Singles or Doubles (Match type: ${match.type}).
      Team A: ${teamANames}.
      Team B: ${teamBNames}.
      Winner: ${winner}.
      Set Scores: ${scoreSummary}.
      Make it sound like a professional sports broadcast recap.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "What a match!";
  } catch (error) {
    console.error("AI Commentary failed", error);
    return "Match recording complete.";
  }
};