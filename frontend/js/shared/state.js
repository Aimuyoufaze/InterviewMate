const state = {
  personaId: null,
  personaName: null,
  sessionId: null,
  field: '',
  isInterviewing: false,
  isLoading: false,
  extractedPersonas: {},
  currentResearchAreas: [],
  backgroundFileName: null,
  backgroundFile: null
};

function resetInterviewState() {
  state.sessionId = null;
  state.isInterviewing = false;
}

export { state, resetInterviewState };
window.state = state;
window.resetInterviewState = resetInterviewState;
