import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore'; // Importar deleteDoc

// Variáveis globais fornecidas pelo ambiente Canvas
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? initialAuthToken : null;

// Função auxiliar para converter base64 para ArrayBuffer (para áudio)
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Função auxiliar para converter áudio PCM para formato WAV (para áudio)
function pcmToWav(pcmData, sampleRate) {
    const numChannels = 1;
    const bytesPerSample = 2; // PCM de 16 bits
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;

    const wavBuffer = new ArrayBuffer(44 + pcmData.byteLength);
    const view = new DataView(wavBuffer);

    // Descritor de chunk RIFF
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.byteLength, true); // ChunkSize
    writeString(view, 8, 'WAVE');

    // Sub-chunk FMT
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 para PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 para PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample

    // Sub-chunk de dados
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.byteLength, true); // Subchunk2Size

    // Escrever dados PCM
    const pcmBytes = new Uint8Array(pcmData.buffer);
    for (let i = 0; i < pcmBytes.length; i++) {
        view.setUint8(44 + i, pcmBytes[i]);
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Componente da Página de Login
function LoginPage({ onLogin, registeredUser, setRegisteredUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [masterPassword, setMasterPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        
        // Tenta fazer login com as credenciais padrão
        if (username === 'gabriel' && password === '130720') {
            onLogin(username); // Passa o nome de utilizador
            return;
        }

        // Tenta fazer login com o utilizador registado na sessão atual
        if (registeredUser && username === registeredUser.username && password === registeredUser.password) {
            onLogin(username); // Passa o nome de utilizador
            return;
        }

        setError('Nome de utilizador ou palavra-passe inválidos.');
    };

    const handleRegister = (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        if (masterPassword === 'donadio') {
            // "Regista" o utilizador apenas em memória para a sessão atual
            setRegisteredUser({ username, password });
            setSuccessMessage(`Conta para '${username}' criada com sucesso! Por favor, faça login.`);
            setIsRegistering(false); // Volta para a tela de login
            setUsername('');
            setPassword('');
            setMasterPassword('');
        } else {
            setError('Palavra-passe mestra incorreta. Não é possível criar a conta.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-800">
                <h2 className="text-3xl font-bold text-center text-white mb-8">Bem-vindo ao Gabriel AI Live</h2>

                {successMessage && (
                    <p className="text-green-500 text-center mb-4">{successMessage}</p>
                )}
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                {!isRegistering ? (
                    <form onSubmit={handleLogin}>
                        <div className="mb-6">
                            <label htmlFor="username" className="block text-gray-400 text-sm font-medium mb-2">
                                Nome de Utilizador
                            </label>
                            <input
                                type="text"
                                id="username"
                                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Introduza o seu nome de utilizador"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-8">
                            <label htmlFor="password" className="block text-gray-400 text-sm font-medium mb-2">
                                Palavra-passe
                            </label>
                            <input
                                type="password"
                                id="password"
                                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Introduza a sua palavra-passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            Entrar
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsRegistering(true); setError(''); setSuccessMessage(''); }}
                            className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            Cadastrar
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        <div className="mb-6">
                            <label htmlFor="regUsername" className="block text-gray-400 text-sm font-medium mb-2">
                                Novo Nome de Utilizador
                            </label>
                            <input
                                type="text"
                                id="regUsername"
                                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Escolha um nome de utilizador"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="regPassword" className="block text-gray-400 text-sm font-medium mb-2">
                                Nova Palavra-passe
                            </label>
                            <input
                                type="password"
                                id="regPassword"
                                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Escolha uma palavra-passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-8">
                            <label htmlFor="masterPassword" className="block text-gray-400 text-sm font-medium mb-2">
                                Palavra-passe Mestra
                            </label>
                            <input
                                type="password"
                                id="masterPassword"
                                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Introduza a palavra-passe mestra"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            Criar Conta
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsRegistering(false); setError(''); setSuccessMessage(''); }}
                            className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            Voltar ao Login
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

// Componente do Aplicativo de Chat Principal
function ChatApp({ db, auth, userId, isLoadingAuth, onLogout, loggedInUsername, setRegisteredUser }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFlashModel, setIsFlashModel] = useState(true); // Padrão para modelo Flash conforme imagem Gemini
    const messagesEndRef = useRef(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Estado para visibilidade da barra lateral (mobile)
    const fileInputRef = useRef(null);
    const [imageGenerationLoading, setImageGenerationLoading] = useState(false);
    const [ttsLoading, setTtsLoading] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false); // Novo estado para o painel de configurações
    const [selectedVoice, setSelectedVoice] = useState("Kore"); // Novo estado para a voz TTS
    const [targetLanguage, setTargetLanguage] = useState("en-US"); // Novo estado para a língua alvo da tradução

    // Vozes TTS disponíveis
    const ttsVoices = [
        { name: "Kore", label: "Kore (Firme)" },
        { name: "Zephyr", label: "Zephyr (Brilhante)" },
        { name: "Puck", label: "Puck (Animado)" },
        { name: "Charon", label: "Charon (Informativo)" },
        { name: "Fenrir", label: "Fenrir (Excitável)" },
        { name: "Leda", label: "Leda (Jovem)" },
        { name: "Orus", label: "Orus (Firme)" },
        { name: "Aoede", label: "Aoede (Leve)" },
        { name: "Callirrhoe", label: "Callirrhoe (Descontraída)" },
        { name: "Autonoe", label: "Autonoe (Brilhante)" },
        { name: "Enceladus", label: "Enceladus (Ofegante)" },
        { name: "Iapetus", label: "Iapetus (Clara)" },
        { name: "Umbriel", label: "Umbriel (Descontraída)" },
        { name: "Algieba", label: "Algieba (Suave)" },
        { name: "Despina", label: "Despina (Suave)" },
        { name: "Erinome", label: "Erinome (Clara)" },
        { name: "Algenib", label: "Algenib (Rascante)" },
        { name: "Rasalgethi", label: "Rasalgethi (Informativa)" },
        { name: "Laomedeia", label: "Laomedeia (Animada)" },
        { name: "Achernar", label: "Achernar (Suave)" },
        { name: "Alnilam", label: "Alnilam (Firme)" },
        { name: "Schedar", label: "Schedar (Uniforme)" },
        { name: "Gacrux", label: "Gacrux (Madura)" },
        { name: "Pulcherrima", label: "Pulcherrima (Direta)" },
        { name: "Achird", label: "Achird (Amigável)" },
        { name: "Zubenelgenubi", label: "Zubenelgenubi (Casual)" },
        { name: "Vindemiatrix", label: "Vindemiatrix (Gentil)" },
        { name: "Sadachbia", label: "Sadachbia (Vívida)" },
        { name: "Sadaltager", label: "Sadaltager (Conhecedora)" },
        { name: "Sulafat", label: "Sulafat (Acolhedora)" },
    ];

    // Línguas para tradução
    const translationLanguages = [
        { code: "en-US", label: "Inglês (EUA)" },
        { code: "pt-PT", label: "Português (Portugal)" },
        { code: "es-ES", label: "Espanhol (Espanha)" },
        { code: "fr-FR", label: "Francês (França)" },
        { code: "de-DE", label: "Alemão (Alemanha)" },
        { code: "it-IT", label: "Italiano (Itália)" },
        { code: "ja-JP", label: "Japonês (Japão)" },
        { code: "ko-KR", label: "Coreano (Coreia)" },
        { code: "zh-CN", label: "Chinês (Simplificado)" },
    ];


    // Rolagem para a última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Carregar conversas do Firestore para o utilizador atual
    useEffect(() => {
        if (db && userId) {
            const userConversationRef = doc(db, `artifacts/${appId}/users/${userId}/currentConversation`, 'chatHistory');
            const unsubscribe = onSnapshot(userConversationRef, (docSnap) => {
                if (docSnap.exists()) {
                    setMessages(docSnap.data().messages || []);
                } else {
                    setMessages([]); // Nenhuma conversa anterior
                }
            }, (error) => {
                console.error("Erro ao carregar conversa do Firestore:", error);
            });
            return () => unsubscribe(); // Limpar o listener ao desmontar
        }
    }, [db, userId]); // Depende de db e userId

    // Função para guardar mensagens no Firestore
    const saveMessagesToFirestore = async (currentMessages) => {
        if (db && userId) {
            const userConversationRef = doc(db, `artifacts/${appId}/users/${userId}/currentConversation`, 'chatHistory');
            try {
                await setDoc(userConversationRef, { messages: currentMessages }, { merge: true });
            } catch (error) {
                console.error("Erro ao guardar conversa no Firestore:", error);
            }
        }
    };

    // Função para chamar a API Gemini para geração de texto
    const generateText = async (prompt, imageData = null) => {
        setIsLoading(true);
        let chatHistory = [];
        const parts = [{ text: prompt }];
        if (imageData) {
            parts.push({
                inlineData: {
                    mimeType: imageData.mimeType,
                    data: imageData.data
                }
            });
        }
        chatHistory.push({ role: "user", parts: parts });

        const payload = { contents: chatHistory };
        const apiKey = ""; // Canvas fornecerá isso automaticamente em tempo de execução
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        // Implementar backoff exponencial para chamadas de API
        const maxRetries = 5;
        let retryCount = 0;
        let delay = 1000; // 1 segundo

        while (retryCount < maxRetries) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429) { // Too Many Requests
                        console.warn(`Tentativa ${retryCount + 1}: Limite de taxa excedido. Tentando novamente em ${delay / 1000}s...`);
                        await new Promise(res => setTimeout(res, delay));
                        delay *= 2; // Backoff exponencial
                        retryCount++;
                        continue;
                    }
                    throw new Error(`Erro HTTP! status: ${response.status}`);
                }

                const result = await response.json();
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    return result.candidates[0].content.parts[0].text;
                } else {
                    console.error("Estrutura de resposta inesperada da API Gemini:", result);
                    return "Desculpe, não consegui gerar uma resposta.";
                }
            } catch (error) {
                console.error("Erro ao chamar a API Gemini:", error);
                return "Ocorreu um erro ao comunicar com a IA.";
            } finally {
                setIsLoading(false);
            }
        }
        setIsLoading(false);
        return "Demasiadas tentativas falhadas. Por favor, tente novamente mais tarde.";
    };

    // Lidar com o envio de uma mensagem
    const handleSendMessage = async () => {
        if (inputMessage.trim() === '') return;

        const newUserMessage = { text: inputMessage, sender: 'user' };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInputMessage('');
        saveMessagesToFirestore(updatedMessages); // Guardar mensagens

        const aiResponseText = await generateText(inputMessage);
        const newAiMessage = { text: aiResponseText, sender: 'ai' };
        const finalMessages = [...updatedMessages, newAiMessage];
        setMessages(finalMessages);
        saveMessagesToFirestore(finalMessages); // Guardar mensagens
    };

    // Lidar com os botões de ação especiais
    const handleActionButton = async (actionType) => {
        let promptModifier = '';
        let currentChatContext = messages.filter(msg => msg.sender === 'user' || msg.sender === 'ai').map(msg => msg.text).join('\n');

        if (currentChatContext.length > 500) { // Limitar o contexto para evitar prompts excessivamente longos
            currentChatContext = currentChatContext.substring(currentChatContext.length - 500);
        }

        switch (actionType) {
            case 'summarize':
                promptModifier = `Resuma o seguinte texto/conversa: "${currentChatContext}"`;
                break;
            case 'expand':
                promptModifier = `Expanda a última resposta ou o seguinte texto: "${currentChatContext}"`;
                break;
            case 'ideas':
                promptModifier = `Gere ideias criativas baseadas no seguinte contexto/conversa: "${currentChatContext}"`;
                break;
            case 'paraphrase':
                promptModifier = `Reescreva/parafraseie o seguinte texto: "${currentChatContext}"`;
                break;
            case 'translate':
                promptModifier = `Traduza o seguinte texto para o inglês (ou outro idioma, se especificado): "${currentChatContext}"`;
                break;
            case 'sentiment':
                promptModifier = `Analise o sentimento do seguinte texto: "${currentChatContext}"`;
                break;
            case 'keywords':
                promptModifier = `Extraia as palavras-chave do seguinte texto: "${currentChatContext}"`;
                break;
            case 'stories':
                promptModifier = `Gere uma história/poema com base no seguinte tema/contexto: "${currentChatContext}"`;
                break;
            case 'explainCode':
                promptModifier = `Explique o seguinte código (assumindo que o código foi fornecido ou está implícito no contexto): "${currentChatContext}"`;
                break;
            case 'creativePrompt':
                promptModifier = `Gere um tópico interessante para escrita criativa.`;
                break;
            default:
                promptModifier = "Por favor, forneça mais detalhes sobre o que gostaria que eu fizesse.";
        }

        const newUserMessage = { text: promptModifier, sender: 'user' };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        saveMessagesToFirestore(updatedMessages); // Guardar mensagens

        const aiResponseText = await generateText(promptModifier);
        const newAiMessage = { text: aiResponseText, sender: 'ai' };
        const finalMessages = [...updatedMessages, newAiMessage];
        setMessages(finalMessages);
        saveMessagesToFirestore(finalMessages); // Guardar mensagens
    };

    // Lidar com o upload de imagem para compreensão
    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = reader.result.split(',')[1];
                const mimeType = file.type;

                const userPrompt = "Descreva esta imagem.";
                const newUserMessage = { text: userPrompt, sender: 'user', image: reader.result };
                const updatedMessages = [...messages, newUserMessage];
                setMessages(updatedMessages);
                saveMessagesToFirestore(updatedMessages); // Guardar mensagens

                const aiResponseText = await generateText(userPrompt, { mimeType, data: base64Data });
                const newAiMessage = { text: aiResponseText, sender: 'ai' };
                const finalMessages = [...updatedMessages, newAiMessage];
                setMessages(finalMessages);
                saveMessagesToFirestore(finalMessages); // Guardar mensagens
            };
            reader.readAsDataURL(file);
        }
    };

    // Lidar com a geração de imagem
    const handleGenerateImage = async () => {
        const imagePrompt = prompt("Introduza uma descrição para a imagem que gostaria de gerar:");
        if (!imagePrompt) return;

        setImageGenerationLoading(true);
        const newUserMessage = { text: `Gerar imagem: "${imagePrompt}"`, sender: 'user' };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        saveMessagesToFirestore(updatedMessages); // Guardar mensagens

        const payload = { instances: { prompt: imagePrompt }, parameters: { "sampleCount": 1} };
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

        const maxRetries = 5;
        let retryCount = 0;
        let delay = 1000;

        while (retryCount < maxRetries) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn(`Tentativa ${retryCount + 1}: Limite de taxa excedido. Tentando novamente em ${delay / 1000}s...`);
                        await new Promise(res => setTimeout(res, delay));
                        delay *= 2;
                        retryCount++;
                        continue;
                    }
                    throw new Error(`Erro HTTP! status: ${response.status}`);
                }

                const result = await response.json();
                if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
                    const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
                    const newAiMessage = { text: "Aqui está a sua imagem:", sender: 'ai', image: imageUrl };
                    const finalMessages = [...updatedMessages, newAiMessage];
                    setMessages(finalMessages);
                    saveMessagesToFirestore(finalMessages); // Guardar mensagens
                } else {
                    console.error("Estrutura de resposta inesperada da API Imagen:", result);
                    const newAiMessage = { text: "Desculpe, não consegui gerar a imagem.", sender: 'ai' };
                    const finalMessages = [...updatedMessages, newAiMessage];
                    setMessages(finalMessages);
                    saveMessagesToFirestore(finalMessages); // Guardar mensagens
                }
            } catch (error) {
                console.error("Erro ao chamar a API Imagen:", error);
                const newAiMessage = { text: "Ocorreu um erro ao gerar a imagem.", sender: 'ai' };
                const finalMessages = [...updatedMessages, newAiMessage];
                setMessages(finalMessages);
                saveMessagesToFirestore(finalMessages); // Guardar mensagens
            } finally {
                setImageGenerationLoading(false);
            }
        }
        setImageGenerationLoading(false);
    };

    // Lidar com a conversão de texto para voz (TTS)
    const handleTextToSpeech = async (text) => {
        setTtsLoading(true);
        const payload = {
            contents: [{
                parts: [{ text: text }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: selectedVoice } // Usar a voz selecionada
                    }
                }
            },
            model: "gemini-2.5-flash-preview-tts"
        };
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

        const maxRetries = 5;
        let retryCount = 0;
        let delay = 1000;

        while (retryCount < maxRetries) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn(`Tentativa ${retryCount + 1}: Limite de taxa excedido. Tentando novamente em ${delay / 1000}s...`);
                        await new Promise(res => setTimeout(res, delay));
                        delay *= 2;
                        retryCount++;
                        continue;
                    }
                    throw new Error(`Erro HTTP! status: ${response.status}`);
                }

                const result = await response.json();
                const part = result?.candidates?.[0]?.content?.parts?.[0];
                const audioData = part?.inlineData?.data;
                const mimeType = part?.inlineData?.mimeType;

                if (audioData && mimeType && mimeType.startsWith("audio/")) {
                    const sampleRateMatch = mimeType.match(/rate=(\d+)/);
                    const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 16000; // Padrão para 16kHz se não encontrado
                    const pcmData = base64ToArrayBuffer(audioData);
                    const pcm16 = new Int16Array(pcmData);
                    const wavBlob = pcmToWav(pcm16, sampleRate);
                    const audioUrl = URL.createObjectURL(wavBlob);
                    const audio = new Audio(audioUrl);
                    audio.play();
                } else {
                    console.error("Estrutura de resposta inesperada da API TTS ou dados de áudio ausentes:", result);
                }
            } catch (error) {
                console.error("Erro ao chamar a API TTS:", error);
            } finally {
                setTtsLoading(false);
            }
        }
        setTtsLoading(false);
    };

    // Lidar com a limpeza do histórico de chat
    const handleClearChat = () => {
        setMessages([]);
        saveMessagesToFirestore([]); // Limpar também no Firestore
        setShowSettingsPanel(false); // Fechar o painel de configurações após limpar
    };

    // Lidar com o resumo de uma mensagem específica da IA
    const handleSummarizeAiResponse = async (textToSummarize) => {
        const prompt = `Resuma o seguinte texto: "${textToSummarize}"`;
        const newUserMessage = { text: `Resumir: "${textToSummarize.substring(0, 50)}..."`, sender: 'user' };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        saveMessagesToFirestore(updatedMessages);

        const aiResponseText = await generateText(prompt);
        const newAiMessage = { text: aiResponseText, sender: 'ai' };
        const finalMessages = [...updatedMessages, newAiMessage];
        setMessages(finalMessages);
        saveMessagesToFirestore(finalMessages);
    };

    // Lidar com a tradução de uma mensagem específica da IA
    const handleTranslateAiResponse = async (textToTranslate) => {
        const prompt = `Traduza o seguinte texto para ${translationLanguages.find(lang => lang.code === targetLanguage).label}: "${textToTranslate}"`;
        const newUserMessage = { text: `Traduzir para ${translationLanguages.find(lang => lang.code === targetLanguage).label}: "${textToTranslate.substring(0, 50)}..."`, sender: 'user' };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        saveMessagesToFirestore(updatedMessages);

        const aiResponseText = await generateText(prompt);
        const newAiMessage = { text: aiResponseText, sender: 'ai' };
        const finalMessages = [...updatedMessages, newAiMessage];
        setMessages(finalMessages);
        saveMessagesToFirestore(finalMessages);
    };

    // Lidar com a geração de um tópico criativo
    const handleGenerateCreativePrompt = async () => {
        const prompt = "Gere um tópico interessante para escrita criativa.";
        const newUserMessage = { text: "Gerar tópico criativo...", sender: 'user' };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        saveMessagesToFirestore(updatedMessages);

        const aiResponseText = await generateText(prompt);
        const newAiMessage = { text: aiResponseText, sender: 'ai' };
        const finalMessages = [...updatedMessages, newAiMessage];
        setMessages(finalMessages);
        saveMessagesToFirestore(finalMessages);
    };

    // Lidar com a exclusão do utilizador
    const handleDeleteUser = async () => {
        const confirmDelete = window.confirm("Tem a certeza que deseja excluir a sua conta? Esta ação é irreversível e apagará todas as suas conversas.");
        if (confirmDelete) {
            if (db && userId) {
                const userConversationRef = doc(db, `artifacts/${appId}/users/${userId}/currentConversation`, 'chatHistory');
                try {
                    await deleteDoc(userConversationRef);
                    console.log("Conversas do utilizador eliminadas do Firestore.");
                } catch (error) {
                    console.error("Erro ao eliminar conversas do utilizador:", error);
                }
            }
            // Como não estamos a usar Firebase Auth para criar utilizadores,
            // a "exclusão" do utilizador é basicamente deslogá-lo e limpar o estado local.
            // Se estivéssemos a usar Firebase Auth, seria auth.currentUser.delete();
            setRegisteredUser(null); // Limpa o utilizador registado em memória
            onLogout(); // Desloga o utilizador
            setShowSettingsPanel(false); // Fecha o painel de configurações
        }
    };


    // Ícones SVG inline para simular Lucide React
    const Menu = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>;
    const MessageSquare = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    const Settings = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.74v.44a2 2 0 0 1-2 2v.18a2 2 0 0 0-1 1.73l-.43.25a2 2 0 0 0-2 0l-.15-.08a2 2 0 0 1-.73 2.73l.22.38a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.74v.44a2 2 0 0 1 2 2v.18a2 2 0 0 0 1 1.73l.43.25a2 2 0 0 0 2 0l.15-.08a2 2 0 0 1 2.73.73l.22.38a2 2 0 0 0-.73 2.73l-.15-.08a2 2 0 0 1-1.74 1h-.44a2 2 0 0 1-2-2v-.18a2 2 0 0 0-1-1.73l-.43-.25a2 2 0 0 0-2 0l-.15.08a2 2 0 0 1-.73-2.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.44a2 2 0 0 1 2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
    const Plus = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 5V19"/><path d="M5 12H19"/></svg>;
    const Mic = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
    const Sparkles = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.9 10.8c-.4.7-.7 1.4-.7 2.2 0 .8.3 1.5.7 2.2.4.7.9 1.3 1.5 1.8.6.5 1.3.8 2.1.8.8 0 1.5-.3 2.1-.8.6-.5 1.1-1.1 1.5-1.8.4-.7.7-1.4.7-2.2 0-.8-.3-1.5-.7-2.2-.4-.7-.9-1.3-1.5-1.8-.6-.5-1.3-.8-2.1-.8-.8 0-1.5.3-2.1.8-.6.5-1.1 1.1-1.5 1.8z"/><path d="M12 2L14.5 7.5L20 9L14.5 10.5L12 16L9.5 10.5L4 9L9.5 7.5L12 2z"/></svg>;
    const Image = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
    const Volume2 = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M22.39 2.61a14 14 0 0 1 0 19.78"/></svg>;
    const ClipboardList = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>;
    const Languages = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m5 8 6 6"/><path d="m11 8 6 6"/><path d="m2 11h11"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>;
    const Lightbulb = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 6c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 22v-4"/></svg>;
    const Trash2 = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;


    return (
        <div className="flex h-screen bg-gray-950 text-gray-100 font-inter">
            {/* Barra Lateral */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-gray-900 p-4 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 rounded-l-lg shadow-lg`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                        <Sparkles className="text-purple-400 w-6 h-6" />
                        <span className="text-2xl font-bold text-white">Gabriel AI</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
                <button
                    onClick={handleClearChat} // Botão "Nova Conversa" agora limpa o chat e o Firestore
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg mb-4 flex items-center justify-center space-x-2 transition duration-300 ease-in-out transform hover:scale-[1.02]"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nova Conversa</span>
                </button>
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                    {/* Placeholder para lista de conversas. Para esta iteração, focamos na conversa atual. */}
                    <ul className="space-y-2">
                        {/* No futuro, pode listar conversas aqui e carregá-las ao clicar */}
                        {/* <li><a href="#" className="flex items-center space-x-2 text-gray-300 hover:text-purple-300 hover:bg-gray-800 p-2 rounded-md transition duration-200"><MessageSquare className="w-5 h-5" /><span>Conversa Atual</span></a></li> */}
                    </ul>
                </div>
                <div className="border-t border-gray-800 pt-4 mt-4">
                    <button
                        onClick={() => {
                            setShowSettingsPanel(true);
                            setIsSidebarOpen(false); // Fechar a barra lateral no telemóvel ao abrir as configurações
                        }}
                        className={`w-full flex items-center space-x-2 p-2 rounded-md transition duration-200 ${
                            showSettingsPanel ? 'bg-gray-800 text-purple-300 font-bold' : 'text-gray-300 hover:text-purple-300 hover:bg-gray-800'
                        }`}
                    >
                        <Settings className="w-5 h-5" />
                        <span>Configurações</span>
                    </button>
                    <div className="text-sm text-gray-500 mt-2">
                        ID do Utilizador: {userId ? userId.substring(0, 8) + '...' : 'N/A'}
                    </div>
                    <button
                        onClick={onLogout} // Botão Sair agora chama a função onLogout do componente pai
                        className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg mt-4 shadow-md transition duration-300 ease-in-out transform hover:scale-[1.02]"
                    >
                        Sair
                    </button>
                </div>
            </div>

            {/* Área Principal do Chat */}
            <div className="flex-1 flex flex-col bg-gray-900 md:rounded-r-lg shadow-xl">
                {/* Barra Superior */}
                <div className="bg-gray-850 p-4 flex justify-between items-center border-b border-gray-800 rounded-tr-lg">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-white">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="relative">
                            <select
                                className="appearance-none bg-gray-700 text-white py-2 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={isFlashModel ? "2.5 Flash" : "Default"}
                                onChange={(e) => setIsFlashModel(e.target.value === "2.5 Flash")}
                            >
                                <option value="2.5 Flash">2.5 Flash</option>
                                <option value="Default">Modelo Padrão</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">PRO</span>
                        <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {loggedInUsername ? loggedInUsername.charAt(0).toUpperCase() : 'G'}
                        </div>
                    </div>
                </div>

                {/* Área de Conteúdo Principal */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto custom-scrollbar">
                    {messages.length === 0 ? (
                        <div className="text-center">
                            <h1 className="text-4xl font-bold text-blue-400 mb-4">Olá, {loggedInUsername || 'Gabriel'}</h1>
                            <p className="text-gray-400 text-lg">Como posso ajudar hoje?</p>
                        </div>
                    ) : (
                        <div className="w-full max-w-3xl">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[70%] p-3 rounded-xl shadow-md ${
                                            msg.sender === 'user'
                                                ? 'bg-blue-700 text-white rounded-br-none'
                                                : 'bg-gray-700 text-gray-100 rounded-bl-none'
                                        }`}
                                    >
                                        {msg.text}
                                        {msg.image && (
                                            <img src={msg.image} alt="Conteúdo da mensagem" className="mt-2 rounded-lg max-w-full h-auto" />
                                        )}
                                        {msg.sender === 'ai' && msg.text && (
                                            <div className="flex items-center mt-2 space-x-2">
                                                <button
                                                    onClick={() => handleTextToSpeech(msg.text)}
                                                    className="p-1 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition duration-200"
                                                    disabled={ttsLoading}
                                                    title="Ouvir resposta"
                                                >
                                                    {ttsLoading ? (
                                                        <div className="dot-pulse-small"></div>
                                                    ) : (
                                                        <Volume2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleSummarizeAiResponse(msg.text)}
                                                    className="p-1 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition duration-200"
                                                    title="Resumir resposta"
                                                >
                                                    <ClipboardList className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleTranslateAiResponse(msg.text)}
                                                    className="p-1 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition duration-200"
                                                    title={`Traduzir para ${translationLanguages.find(lang => lang.code === targetLanguage).label}`}
                                                >
                                                    <Languages className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start mb-4">
                                    <div className="max-w-[70%] p-3 rounded-xl shadow-md bg-gray-700 text-gray-100 rounded-bl-none">
                                        <div className="dot-pulse"></div>
                                    </div>
                                </div>
                            )}
                            {imageGenerationLoading && (
                                <div className="flex justify-start mb-4">
                                    <div className="max-w-[70%] p-3 rounded-xl shadow-md bg-gray-700 text-gray-100 rounded-bl-none">
                                        A gerar imagem... <div className="dot-pulse"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Entrada de Mensagem e Botões de Ação */}
                <div className="p-4 bg-gray-900 border-t border-gray-800 flex flex-col items-center rounded-bl-lg rounded-br-lg">
                    {messages.length === 0 && ( // Mostrar botões de ação apenas quando o chat estiver vazio
                        <div className="flex flex-wrap justify-center gap-2 mb-4 w-full max-w-3xl">
                            <button onClick={() => handleActionButton('summarize')} className="action-button">Resumir ✨</button>
                            <button onClick={() => handleActionButton('ideas')} className="action-button">Gerar Ideias ✨</button>
                            <button onClick={() => handleActionButton('translate')} className="action-button">Traduzir ✨</button>
                            <button onClick={() => handleActionButton('explainCode')} className="action-button">Explicar Código ✨</button>
                            <button onClick={handleGenerateCreativePrompt} className="action-button">Gerar Tópico Criativo ✨</button>
                        </div>
                    )}

                    <div className="w-full max-w-3xl bg-gray-800 rounded-full flex items-center px-4 py-2 shadow-lg border border-gray-700">
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition duration-200"
                            title="Carregar Imagem"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none px-3"
                            placeholder="Pergunte ao Gabriel AI"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') handleSendMessage();
                            }}
                            disabled={isLoading || imageGenerationLoading || ttsLoading}
                        />
                        <button
                            onClick={handleGenerateImage}
                            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition duration-200"
                            title="Gerar Imagem"
                            disabled={imageGenerationLoading || isLoading || ttsLoading}
                        >
                            <Image className="w-5 h-5" />
                        </button>
                        <button className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition duration-200" title="Usar Microfone">
                            <Mic className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSendMessage}
                            className="ml-2 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition duration-200"
                            disabled={isLoading || imageGenerationLoading || ttsLoading}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M9.3 9.3 17 17"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Painel de Configurações (Modal/Overlay) */}
            {showSettingsPanel && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-800 relative">
                        <h2 className="text-2xl font-bold text-white mb-6">Configurações</h2>
                        <button
                            onClick={() => setShowSettingsPanel(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>

                        <div className="mb-6">
                            <label htmlFor="ttsVoice" className="block text-gray-400 text-sm font-medium mb-2">
                                Voz de Texto para Voz (TTS)
                            </label>
                            <select
                                id="ttsVoice"
                                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                            >
                                {ttsVoices.map(voice => (
                                    <option key={voice.name} value={voice.name}>
                                        {voice.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="targetLanguage" className="block text-gray-400 text-sm font-medium mb-2">
                                Língua de Tradução
                            </label>
                            <select
                                id="targetLanguage"
                                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={targetLanguage}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                            >
                                {translationLanguages.map(lang => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleClearChat}
                            className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 mb-4"
                        >
                            Limpar Histórico de Conversa
                        </button>

                        <button
                            onClick={handleDeleteUser}
                            className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span>Excluir Utilizador</span>
                        </button>
                    </div>
                </div>
            )}

            {/* CSS Personalizado para barra de rolagem e animação de carregamento */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1f2937; /* gray-800 */
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #8B5CF6; /* purple-500 */
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #A78BFA; /* purple-400 */
                }

                .action-button {
                    @apply bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium py-2 px-4 rounded-full shadow-sm transition duration-300 ease-in-out;
                }

                /* Animação de carregamento de pontos */
                .dot-pulse {
                    position: relative;
                    left: -9999px;
                    width: 10px;
                    height: 10px;
                    border-radius: 5px;
                    background-color: #9CA3AF; /* gray-400 */
                    color: #9CA3AF; /* gray-400 */
                    box-shadow: 9999px 0 0 -5px;
                    animation: dotPulse 1.5s infinite linear;
                    animation-delay: .25s;
                }
                .dot-pulse::before, .dot-pulse::after {
                    content: '';
                    display: inline-block;
                    position: absolute;
                    top: 0;
                    width: 10px;
                    height: 10px;
                    border-radius: 5px;
                    background-color: #9CA3AF; /* gray-400 */
                    color: #9CA3AF; /* gray-400 */
                }
                .dot-pulse::before {
                    box-shadow: 9984px 0 0 -5px;
                    animation: dotPulseBefore 1.5s infinite linear;
                    animation-delay: 0s;
                }
                .dot-pulse::after {
                    box-shadow: 10014px 0 0 -5px;
                    animation: dotPulseAfter 1.5s infinite linear;
                    animation-delay: .5s;
                }
                @keyframes dotPulseBefore {
                    0% { box-shadow: 9984px 0 0 -5px; }
                    30% { box-shadow: 9984px 0 0 2px; }
                    60%, 100% { box-shadow: 9984px 0 0 -5px; }
                }
                @keyframes dotPulse {
                    0% { box-shadow: 9999px 0 0 -5px; }
                    30% { box-shadow: 9999px 0 0 2px; }
                    60%, 100% { box-shadow: 9999px 0 0 -5px; }
                }
                @keyframes dotPulseAfter {
                    0% { box-shadow: 10014px 0 0 -5px; }
                    30% { box-shadow: 10014px 0 0 2px; }
                    60%, 100% { box-shadow: 10014px 0 0 -5px; }
                }

                .dot-pulse-small {
                    position: relative;
                    left: -9999px;
                    width: 6px;
                    height: 6px;
                    border-radius: 3px;
                    background-color: #9CA3AF; /* gray-400 */
                    color: #9CA3AF; /* gray-400 */
                    box-shadow: 9999px 0 0 -3px;
                    animation: dotPulseSmall 1.5s infinite linear;
                    animation-delay: .25s;
                }
                .dot-pulse-small::before, .dot-pulse-small::after {
                    content: '';
                    display: inline-block;
                    position: absolute;
                    top: 0;
                    width: 6px;
                    height: 6px;
                    border-radius: 3px;
                    background-color: #9CA3AF; /* gray-400 */
                    color: #9CA3AF; /* gray-400 */
                }
                .dot-pulse-small::before {
                    box-shadow: 9988px 0 0 -3px;
                    animation: dotPulseBeforeSmall 1.5s infinite linear;
                    animation-delay: 0s;
                }
                @keyframes dotPulseBeforeSmall {
                    0% { box-shadow: 9988px 0 0 -3px; }
                    30% { box-shadow: 9988px 0 0 1px; }
                    60%, 100% { box-shadow: 9988px 0 0 -3px; }
                }
                @keyframes dotPulseSmall {
                    0% { box-shadow: 9999px 0 0 -3px; }
                    30% { box-shadow: 9999px 0 0 1px; }
                    60%, 100% { box-shadow: 9999px 0 0 -3px; }
                }
                @keyframes dotPulseAfterSmall {
                    0% { box-shadow: 10008px 0 0 -3px; }
                    30% { box-shadow: 10008px 0 0 1px; }
                    60%, 100% { box-shadow: 10008px 0 0 -3px; }
                }
            `}</style>
        </div>
    );
}

// Componente App principal para gerenciar o estado de login
function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [registeredUser, setRegisteredUser] = useState(null); // Estado para armazenar o utilizador registado
    const [loggedInUsername, setLoggedInUsername] = useState(null); // Novo estado para armazenar o nome de utilizador logado

    // Inicializar Firebase e lidar com a autenticação
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // Entrar anonimamente se nenhum utilizador estiver logado
                    if (initialAuthToken) {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                    setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Erro ao inicializar Firebase:", error);
        }
    }, []);

    // Atualiza o estado de login e o nome de utilizador
    const handleLoginSuccess = (username) => {
        setIsLoggedIn(true);
        setLoggedInUsername(username);
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setLoggedInUsername(null); // Limpa o nome de utilizador ao sair
        // Opcional: Limpar qualquer estado de sessão ou token aqui, se aplicável
    };

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                A carregar autenticação...
            </div>
        );
    }

    return (
        <>
            {isLoggedIn ? (
                <ChatApp
                    db={db}
                    auth={auth}
                    userId={userId}
                    isLoadingAuth={!isAuthReady}
                    onLogout={handleLogout}
                    loggedInUsername={loggedInUsername} // Passa o nome de utilizador para o ChatApp
                    setRegisteredUser={setRegisteredUser} // Passa setRegisteredUser para o ChatApp
                />
            ) : (
                <LoginPage
                    onLogin={handleLoginSuccess}
                    registeredUser={registeredUser}
                    setRegisteredUser={setRegisteredUser}
                />
            )}
        </>
    );
}

export default App;
