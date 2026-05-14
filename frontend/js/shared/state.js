const state = {
  // -- 视图 --
  currentView: 'chat',             // 'chat' | 'interview' | 'history'

  // -- 面试 --
  personaId: null,
  personaName: null,
  sessionId: null,
  field: '',
  isInterviewing: false,
  isLoading: false,
  extractedPersonas: {},
  currentResearchAreas: [],
  interviewSubState: 'setup',      // 'setup' | 'active'

  // -- 背景 / 简历 --
  backgroundFileName: null,
  backgroundFile: null,

  // -- Main Agent 聊天 --
  chatMessages: [],                // 对话历史

  // -- 历史记录 --
  historyList: [],
  historyDetailId: null,

  // -- 用户设置 --
  userProfile: {
    name: '',
    agentProfileId: 'friendly',
    agentCustomPrompt: '',
    deepseekApiKey: '',
    deepseekBaseUrl: '',
  }
};

function resetInterviewState() {
  state.sessionId = null;
  state.isInterviewing = false;
}

export { state, resetInterviewState };
