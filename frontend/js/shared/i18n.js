import { getStorage, setStorage } from './storage.js';
import { state } from './state.js';

const _lang = {
  zh: {
    'lang.select.prompt': '请选择语言',
    'welcome.eyebrow': 'Mock Interview',
    'welcome.title': '开启一场<br/>认真的<i>模拟面试</i>。',
    'welcome.desc': '选择一位面试官，确定方向，然后开始一场拟真度极高的对话练习。每一轮都会被记录，并在结束时生成评估报告。',
    'step.persona.title': '选择面试官',
    'step.persona.helper': '从内置人格中挑选，或在下方蒸馏出一位真实导师作为面试官。',
    'step.extract.title': '蒸馏一位导师',
    'step.extract.helper': '输入导师姓名与所属机构，利用 AI 分析其论文和公开信息，自动生成专属面试官。',
    'step.extract.name_placeholder': '导师姓名（如 Yoshua Bengio）',
    'step.extract.affil_placeholder': '所属机构（如 University of Montreal）',
    'step.extract.btn': '🎯 提取 Persona',
    'step.resume.title': '上传个人简历',
    'step.resume.helper': '上传你的简历，面试官将会阅读并根据你的背景和经历进行针对性提问。',
    'step.resume.select_btn': '📄 选择文件',
    'step.resume.not_uploaded': '尚未上传',
    'step.resume.delete_btn': '删除',
    'step.field.title': '面试方向',
    'step.field.helper': '这将决定面试官提问的领域与深度。',
    'step.field.label': '目标专业方向',
    'step.field.professor': '🎓 该教授自身专业',
    'step.field.other': '其他（请自定义）',
    'step.field.custom_placeholder': '在此输入自定义方向',
    'field.ai': '计算机科学 / 人工智能',
    'field.ds': '数据科学 / 机器学习',
    'field.nlp': '自然语言处理',
    'field.cv': '计算机视觉',
    'field.security': '网络安全',
    'field.se': '软件工程',
    'field.auto': '自动化',
    'field.robotics': '机器人学',
    'field.bioinfo': '生物信息学',
    'field.cogsci': '认知科学',
    'field.neuro': '计算神经科学',
    'field.econ': '经济学',
    'field.mgmt': '管理学',
    'field.mse': '管理科学与工程',
    'field.stat': '统计学',
    'field.physics': '物理',
    'field.math': '数学',
    'field.chem': '化学',
    'field.bio': '生物学',
    'field.med': '医学',
    'field.law': '法学',
    'field.edu': '教育学',
    'field.psych': '心理学',
    'btn.start': '开始面试 →',
    'btn.shortcut': '回车键发送回答 · 支持语音输入',
    'btn.new_interview': '🔄 新面试',
    'btn.wait_connect': '⏳ 连接中...',
    'btn.end_interview': '结束面试',
    'status.ready': '就绪',
    'status.interviewing': '面试进行中',
    'status.thinking': '面试官思考中...',
    'status.generating': '生成反馈报告中...',
    'status.recording': '🎤 录音中...',
    'status.transcribing': '🎤 转写中...',
    'status.backend_recording': '🎤 录音中... (后端转写)',
    'input.placeholder': '输入你的回答...',
    'stt.browser': '🌐 浏览器识别',
    'stt.backend': '🔧 后端转写',
    'btn.send': '发送',
    'msg.interviewer': '面试官',
    'msg.you': '你',
    'msg.interviewer_with': '面试官 · ',
    'msg.error_prefix': '⚠️ 回复获取失败: ',
    'msg.error_retry': '。请稍后重试。',
    'persona.general': '🎭 通用面试官',
    'persona.extracted': '🎓 已蒸馏的导师',
    'persona.general_tag': '通用',
    'extract.loading': '⏳ 提取中...',
    'extract.success': '🎉 成功提取 "${name}" 的学术画像！',
    'extract.alert': '🎉 已成功提取 "${name}" 的面试官画像！\n已添加到面试官列表，请重新选择。',
    'extract.no_name': '请输入导师姓名',
    'extract.fail': '❌ 提取失败: ',
    'settings.title': '📝 编辑资料',
    'settings.bg_file': '项目背景文件',
    'settings.bg_none': '未上传背景文件',
    'settings.bg_upload': '上传文件',
    'settings.bg_delete': '删除文件',
    'settings.bg_success': '✅ 已上传: ',
    'settings.bg_deleted': '🗑️ 背景文件已删除',
    'settings.bg_confirm_delete': '确定删除背景文件吗？',
    'settings.resume': '个人简历',
    'settings.resume_none': '未上传简历',
    'settings.resume_upload': '上传简历',
    'settings.resume_delete': '删除简历',
    'settings.resume_success': '✅ 简历上传成功',
    'settings.resume_deleted': '🗑️ 简历已删除',
    'settings.resume_confirm_delete': '确定删除简历吗？',
    'settings.persona': '当前面试官',
    'settings.persona_none': '暂无选择',
    'settings.close': '关闭',
    'settings.query_fail': '查询失败',
    'onboard.title': '欢迎使用 Interview Mate',
    'onboard.desc': '是否有相关的项目背景文件？例如「金融硕士项目」「管科博士项目」等。<br/>上传后，面试官将根据你的项目背景进行针对性提问。',
    'onboard.upload_label': '上传项目背景文件（PDF / TXT）',
    'onboard.skip_hint': '💡 也可以跳过，稍后在 📝 编辑资料中上传',
    'onboard.skip': '暂时跳过',
    'onboard.confirm': '确认并开始使用',
    'onboard.skipped': '👋 可以在编辑资料中随时上传背景文件',
    'onboard.uploaded': '✅ 已上传: ',
    'feedback.title': '面试评估报告',
    'feedback.loading': '加载中...',
    'feedback.download': '📥 下载面试总结',
    'feedback.close': '关闭并回到首页',
    'feedback.no_data': '❌ 没有可下载的面试总结',
    'loading.title': '报告生成中...',
    'loading.desc': '正在分析你的面试表现，请稍候',
    'detail.title': '导师画像',
    'detail.loading': '⏳ 加载中...',
    'detail.professor': '教授',
    'detail.research_areas': '研究方向',
    'detail.research_style': '研究风格',
    'detail.teaching_style': '指导风格',
    'detail.traits': '性格特征',
    'detail.questions': '典型问题',
    'detail.llm_prompt': '🤖 查看 LLM 风格指令',
    'detail.load_fail': '❌ 加载失败: ',
    'detail.close': '关闭',
    'detail.analyzing': '分析中...',
    'detail.at': '@',
    'confirm.delete_persona': '确定要删除导师 "${name}" 的面试官画像吗？（删除后不可恢复）',
    'confirm.delete_persona_done': '🗑️ 已删除 "${name}"',
    'confirm.exit_interview': '确定退出当前面试吗？对话记录将被保留至结束面试。',
    'confirm.end_interview': '确定结束本次面试并生成反馈报告吗？',
    'toast.upload_fail': '❌ 上传失败: ',
    'toast.delete_fail': '❌ 删除失败: ',
    'toast.stt_switch_backend': '🔧 已切换到「后端转写」模式',
    'toast.stt_switch_browser': '🌐 已切换到「浏览器识别」模式',
    'toast.stt_fail': '❌ 语音转写失败: ',
    'toast.stt_mic_blocked': '🎤 麦克风权限被拒绝，请在浏览器设置中允许',
    'toast.stt_service_unavail': '🌐 浏览器语音服务不可用，已自动切换为「后端转写」模式',
    'toast.stt_error': '🎤 识别出错，已切换为「后端转写」模式: ',
    'toast.mic_unavail': '❌ 无法访问麦克风: ',
    'toast.stt_uninit': '❌ 语音识别未初始化',
    'toast.downloaded': '📥 面试总结已下载',
    'toast.resume_success': '✅ 简历上传成功',
    'toast.resume_delete_fail': '❌ 删除失败',
    'download.header': '=== Interview Mate — 面试评估报告 ===',
    'download.date': '日期: ',
    'download.interviewer': '面试官: ',
    'download.field': '方向: ',
    'download.unknown': '未知',
    'error.select_persona': '请先选择一个面试官人格',
    'error.select_field': '请输入/选择目标专业方向',
    'error.start_fail': '启动面试失败: ',
    'error.generating': '生成反馈失败: ',
    'lang.switched': '🌐 已切换为中文',
    // -- 侧边栏 --
    'nav.chat': '对话',
    'nav.interview': '模拟面试',
    'nav.history': '历史记录',
    'sidebar.settings': '设置',
    'sidebar.profile': '📝 编辑资料',
    'sidebar.agent': '配置 Agent',
    'sidebar.resume_status': '简历：未上传',
    'sidebar.resume_ok': '简历：已上传',
    // -- Main Agent 对话 --
    'chat.placeholder': '和 Interview Mate 聊聊...',
    'chat.clear': '清空对话',
    'chat.clear_confirm': '确定清空所有对话吗？',
    'chat.cleared': '对话已清空',
    'chat.title': 'Interview Mate',
    'chat.subtitle': '你的面试备考 AI 陪伴助手',
    'chat.welcome': '你好！我是 Interview Mate，你的面试备考陪伴助手。我可以帮你制定备考计划、解答面试相关的问题、分析你的回答思路。有什么想聊的？',
    // -- 历史记录 --
    'history.title': '面试历史',
    'history.empty': '还没有面试记录。\n去「模拟面试」开始你的第一次练习吧！',
    'history.rounds': '轮',
    'history.view_detail': '查看详情',
    'history.back': '← 返回列表',
    'history.delete': '删除',
    'history.delete_confirm': '确定删除这条面试记录吗？',
    'history.deleted': '已删除',
    // -- Agent 配置 --
    'agent.title': '配置 Main Agent',
    'agent.preset_label': '预设人格',
    'agent.custom_label': '自定义 System Prompt（可选）',
    'agent.preset_friendly': '友好陪伴型',
    'agent.preset_strict': '严格导师型',
    'agent.preset_wise': '睿智学者型',
    'agent.save': '保存',
    'agent.saved': 'Agent 配置已保存',
    'agent.api_key_label': 'DeepSeek API Key',
    'agent.key_source_user': '（使用个人 Key · 优先）',
    'agent.key_source_server': '（使用服务器 Key）',
    'agent.key_source_none': '（未配置）',
    'agent.key_user_active': '当前使用你的个人 Key，优先级高于服务器配置',
    'agent.key_server_hint': '留空则使用服务器默认 Key',
    'agent.key_none_hint': '未检测到可用 Key，请输入你的 API Key',
    'agent.clear_key': '清除并回退服务器 Key',
    'agent.key_cleared': 'API Key 已清除，将使用服务器默认 Key',
    'agent.base_url_label': 'DeepSeek Base URL',
    'agent.base_url_hint': '留空则使用默认地址',
    // -- 用户资料 --
    'profile.title': '编辑资料',
    'profile.name_label': '你的名字',
    'profile.name_placeholder': '让 Agent 知道怎么称呼你',
    'profile.resume_label': '简历',
    'profile.save': '保存',
    'profile.saved': '资料已保存',
  },
  en: {
    'lang.select.prompt': 'Select your language',
    'welcome.eyebrow': 'Mock Interview',
    'welcome.title': 'Start a<br/>serious <i>mock interview</i>.',
    'welcome.desc': 'Pick an interviewer, choose your field, and start a highly realistic conversation. Each round is recorded, and you\'ll receive an evaluation report at the end.',
    'step.persona.title': 'Choose Interviewer',
    'step.persona.helper': 'Pick from built-in personas, or distill a real professor below to create a custom interviewer.',
    'step.extract.title': 'Distill a Professor',
    'step.extract.helper': 'Enter a professor\'s name and institution. We\'ll search their papers and public info to generate a personalized interviewer.',
    'step.extract.name_placeholder': 'Professor name (e.g. Yoshua Bengio)',
    'step.extract.affil_placeholder': 'Institution (e.g. University of Montreal)',
    'step.extract.btn': '🎯 Extract Persona',
    'step.resume.title': 'Upload Resume',
    'step.resume.helper': 'Upload your resume so the interviewer can ask questions tailored to your background and experience.',
    'step.resume.select_btn': '📄 Choose File',
    'step.resume.not_uploaded': 'Not uploaded yet',
    'step.resume.delete_btn': 'Delete',
    'step.field.title': 'Interview Field',
    'step.field.helper': 'This determines the scope and depth of the questions.',
    'step.field.label': 'Target Field',
    'step.field.professor': '🎓 Professor\'s own field',
    'step.field.other': 'Other (custom)',
    'step.field.custom_placeholder': 'Enter a custom field',
    'field.ai': 'Computer Science / AI',
    'field.ds': 'Data Science / Machine Learning',
    'field.nlp': 'Natural Language Processing',
    'field.cv': 'Computer Vision',
    'field.security': 'Cybersecurity',
    'field.se': 'Software Engineering',
    'field.auto': 'Automation',
    'field.robotics': 'Robotics',
    'field.bioinfo': 'Bioinformatics',
    'field.cogsci': 'Cognitive Science',
    'field.neuro': 'Computational Neuroscience',
    'field.econ': 'Economics',
    'field.mgmt': 'Management',
    'field.mse': 'Management Science & Engineering',
    'field.stat': 'Statistics',
    'field.physics': 'Physics',
    'field.math': 'Mathematics',
    'field.chem': 'Chemistry',
    'field.bio': 'Biology',
    'field.med': 'Medicine',
    'field.law': 'Law',
    'field.edu': 'Education',
    'field.psych': 'Psychology',
    'btn.start': 'Start Interview →',
    'btn.shortcut': 'Enter to send · Voice input supported',
    'btn.new_interview': '🔄 New Interview',
    'btn.wait_connect': '⏳ Connecting...',
    'btn.end_interview': 'End Interview',
    'status.ready': 'Ready',
    'status.interviewing': 'Interview in progress',
    'status.thinking': 'Interviewer is thinking...',
    'status.generating': 'Generating report...',
    'status.recording': '🎤 Recording...',
    'status.transcribing': '🎤 Transcribing...',
    'status.backend_recording': '🎤 Recording... (backend STT)',
    'input.placeholder': 'Type your answer...',
    'stt.browser': '🌐 Browser STT',
    'stt.backend': '🔧 Backend STT',
    'btn.send': 'Send',
    'msg.interviewer': 'Interviewer',
    'msg.you': 'You',
    'msg.interviewer_with': 'Interviewer · ',
    'msg.error_prefix': '⚠️ Failed to get response: ',
    'msg.error_retry': '. Please try again.',
    'persona.general': '🎭 General Personas',
    'persona.extracted': '🎓 Extracted Professors',
    'persona.general_tag': 'General',
    'extract.loading': '⏳ Extracting...',
    'extract.success': '🎉 Successfully extracted "${name}"\'s profile!',
    'extract.alert': '🎉 Extracted "${name}"!\nAdded to the list. Please select them as your interviewer.',
    'extract.no_name': 'Please enter a professor name',
    'extract.fail': '❌ Extraction failed: ',
    'settings.title': '📝 Edit Profile',
    'settings.bg_file': 'Background Document',
    'settings.bg_none': 'No background document uploaded',
    'settings.bg_upload': 'Upload File',
    'settings.bg_delete': 'Delete File',
    'settings.bg_success': '✅ Uploaded: ',
    'settings.bg_deleted': '🗑️ Background file deleted',
    'settings.bg_confirm_delete': 'Delete background file?',
    'settings.resume': 'Resume',
    'settings.resume_none': 'No resume uploaded',
    'settings.resume_upload': 'Upload Resume',
    'settings.resume_delete': 'Delete Resume',
    'settings.resume_success': '✅ Resume uploaded',
    'settings.resume_deleted': '🗑️ Resume deleted',
    'settings.resume_confirm_delete': 'Delete resume?',
    'settings.persona': 'Current Interviewer',
    'settings.persona_none': 'None selected',
    'settings.close': 'Close',
    'settings.query_fail': 'Query failed',
    'onboard.title': 'Welcome to Interview Mate',
    'onboard.desc': 'Do you have a background document about your target program?<br/>Upload it so the interviewer can ask more relevant questions.',
    'onboard.upload_label': 'Upload background file (PDF / TXT)',
    'onboard.skip_hint': '💡 You can skip this and upload later in 📝 Edit Profile',
    'onboard.skip': 'Skip for now',
    'onboard.confirm': 'Confirm & Start',
    'onboard.skipped': '👋 You can upload a background file in Edit Profile anytime',
    'onboard.uploaded': '✅ Uploaded: ',
    'feedback.title': 'Interview Evaluation Report',
    'feedback.loading': 'Loading...',
    'feedback.download': '📥 Download Summary',
    'feedback.close': 'Close & Return Home',
    'feedback.no_data': '❌ No interview summary available',
    'loading.title': 'Generating Report...',
    'loading.desc': 'Analyzing your performance, please wait',
    'detail.title': 'Professor Profile',
    'detail.loading': '⏳ Loading...',
    'detail.professor': 'Professor',
    'detail.research_areas': 'Research Areas',
    'detail.research_style': 'Research Style',
    'detail.teaching_style': 'Mentoring Style',
    'detail.traits': 'Personality Traits',
    'detail.questions': 'Typical Questions',
    'detail.llm_prompt': '🤖 View LLM Style Prompt',
    'detail.load_fail': '❌ Load failed: ',
    'detail.close': 'Close',
    'detail.analyzing': 'Analyzing...',
    'detail.at': '@',
    'confirm.delete_persona': 'Delete professor "${name}"\'s interviewer profile? (Cannot be undone)',
    'confirm.delete_persona_done': '🗑️ Deleted "${name}"',
    'confirm.exit_interview': 'Exit current interview? Conversation history will be kept until you end the interview.',
    'confirm.end_interview': 'End this interview and generate a feedback report?',
    'toast.upload_fail': '❌ Upload failed: ',
    'toast.delete_fail': '❌ Delete failed: ',
    'toast.stt_switch_backend': '🔧 Switched to Backend STT mode',
    'toast.stt_switch_browser': '🌐 Switched to Browser STT mode',
    'toast.stt_fail': '❌ Speech recognition failed: ',
    'toast.stt_mic_blocked': '🎤 Microphone permission denied. Please allow in browser settings',
    'toast.stt_service_unavail': '🌐 Browser speech unavailable. Switched to Backend STT',
    'toast.stt_error': '🎤 Recognition error. Switched to Backend STT: ',
    'toast.mic_unavail': '❌ Cannot access microphone: ',
    'toast.stt_uninit': '❌ Speech recognition not initialized',
    'toast.downloaded': '📥 Interview summary downloaded',
    'toast.resume_success': '✅ Resume uploaded',
    'toast.resume_delete_fail': '❌ Delete failed',
    'download.header': '=== Interview Mate — Evaluation Report ===',
    'download.date': 'Date: ',
    'download.interviewer': 'Interviewer: ',
    'download.field': 'Field: ',
    'download.unknown': 'Unknown',
    'error.select_persona': 'Please select an interviewer persona first',
    'error.select_field': 'Please enter/select a target field',
    'error.start_fail': 'Failed to start interview: ',
    'error.generating': 'Failed to generate feedback: ',
    'lang.switched': '🌐 Switched to English',
    // -- Sidebar --
    'nav.chat': 'Chat',
    'nav.interview': 'Mock Interview',
    'nav.history': 'History',
    'sidebar.settings': 'Settings',
    'sidebar.profile': '📝 Edit Profile',
    'sidebar.agent': 'Configure Agent',
    'sidebar.resume_status': 'Resume: Not uploaded',
    'sidebar.resume_ok': 'Resume: Uploaded',
    // -- Main Agent Chat --
    'chat.placeholder': 'Chat with Interview Mate...',
    'chat.clear': 'Clear Chat',
    'chat.clear_confirm': 'Clear all messages?',
    'chat.cleared': 'Chat cleared',
    'chat.title': 'Interview Mate',
    'chat.subtitle': 'Your AI Interview Prep Companion',
    'chat.welcome': "Hi! I'm Interview Mate, your interview prep companion. I can help you make a study plan, answer questions about interviews, and review your responses. What would you like to talk about?",
    // -- History --
    'history.title': 'Interview History',
    'history.empty': 'No interview records yet.\nGo to Mock Interview to start your first practice!',
    'history.rounds': 'rounds',
    'history.view_detail': 'View Detail',
    'history.back': '← Back to list',
    'history.delete': 'Delete',
    'history.delete_confirm': 'Delete this interview record?',
    'history.deleted': 'Deleted',
    // -- Agent Config --
    'agent.title': 'Configure Main Agent',
    'agent.preset_label': 'Preset Personality',
    'agent.custom_label': 'Custom System Prompt (optional)',
    'agent.preset_friendly': 'Friendly Companion',
    'agent.preset_strict': 'Strict Mentor',
    'agent.preset_wise': 'Wise Scholar',
    'agent.save': 'Save',
    'agent.saved': 'Agent configuration saved',
    'agent.api_key_label': 'DeepSeek API Key',
    'agent.key_source_user': ' (personal key)',
    'agent.key_source_server': ' (server key)',
    'agent.key_source_none': ' (not configured)',
    'agent.key_user_active': 'Using your personal key (takes priority)',
    'agent.key_server_hint': 'Leave empty to use server default key',
    'agent.key_none_hint': 'No API key detected. Please enter your key.',
    'agent.clear_key': 'Clear & fallback to server',
    'agent.key_cleared': 'API Key cleared, using server default',
    'agent.base_url_label': 'DeepSeek Base URL',
    'agent.base_url_hint': 'Leave empty to use default URL',
    // -- User Profile --
    'profile.title': 'Edit Profile',
    'profile.name_label': 'Your Name',
    'profile.name_placeholder': 'Let the Agent know how to address you',
    'profile.resume_label': 'Resume',
    'profile.save': 'Save',
    'profile.saved': 'Profile saved',
  }
};

function getLanguage() {
  try {
    const stored = localStorage.getItem('interviewmate_lang');
    if (stored === 'en' || stored === 'zh') return stored;
  } catch(e) {}
  return 'zh';
}

function setLanguage(lang) {
  try {
    localStorage.setItem('interviewmate_lang', lang);
    setStorage('langChosen', true);
  } catch(e) {}
  const toggle = document.getElementById('langToggle');
  if (toggle) toggle.textContent = lang === 'zh' ? '🇨🇳' : '🇺🇸';
  document.getElementById('langModal')?.classList.remove('show');
  applyLanguage();
  const hasOnboarded = getStorage('hasOnboarded', false);
  if (!hasOnboarded) {
    setTimeout(() => window.dispatchEvent(new CustomEvent('languagefirstset')), 400);
  }
}

function toggleLanguage() {
  const current = getLanguage();
  const next = current === 'zh' ? 'en' : 'zh';
  setLanguage(next);
  showToast(t(next === 'zh' ? 'lang.switched' : 'lang.switched'), 'success');
}

function applyLanguage() {
  const lang = getLanguage();
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  const toggle = document.getElementById('langToggle');
  if (toggle) {
    toggle.textContent = lang === 'zh' ? '🇨🇳' : '🇺🇸';
    toggle.title = lang === 'zh' ? '切换语言' : 'Switch Language';
  }
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.title = lang === 'zh' ? '编辑资料' : 'Edit Profile';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const raw = _lang[lang]?.[key] ?? _lang['zh']?.[key] ?? '';
    if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = raw;
    } else {
      el.textContent = raw;
    }
  });

  const fieldSelect = document.getElementById('fieldSelect');
  if (fieldSelect) {
    const optionLabels = [
      ['__professor_field__', t('step.field.professor')],
      ['计算机科学 / 人工智能', t('field.ai')],
      ['数据科学 / 机器学习', t('field.ds')],
      ['自然语言处理', t('field.nlp')],
      ['计算机视觉', t('field.cv')],
      ['网络安全', t('field.security')],
      ['软件工程', t('field.se')],
      ['自动化', t('field.auto')],
      ['机器人学', t('field.robotics')],
      ['生物信息学', t('field.bioinfo')],
      ['认知科学', t('field.cogsci')],
      ['计算神经科学', t('field.neuro')],
      ['经济学', t('field.econ')],
      ['管理学', t('field.mgmt')],
      ['管理科学与工程', t('field.mse')],
      ['统计学', t('field.stat')],
      ['物理', t('field.physics')],
      ['数学', t('field.math')],
      ['化学', t('field.chem')],
      ['生物学', t('field.bio')],
      ['医学', t('field.med')],
      ['法学', t('field.law')],
      ['教育学', t('field.edu')],
      ['心理学', t('field.psych')],
      ['其他（请自定义）', t('step.field.other')],
    ];
    for (const [val, label] of optionLabels) {
      const opt = fieldSelect.querySelector('option[value="' + val + '"]');
      if (opt) opt.textContent = label;
    }
  }

  const resumeStatus = document.getElementById('resumeStatus');
  if (resumeStatus && !resumeStatus.textContent.includes('✅') && !resumeStatus.textContent.includes('⏳') && !resumeStatus.textContent.includes('❌')) {
    resumeStatus.textContent = t('step.resume.not_uploaded');
  }

  const extractName = document.getElementById('extractName');
  if (extractName) extractName.placeholder = t('step.extract.name_placeholder');
  const extractAffil = document.getElementById('extractAffil');
  if (extractAffil) extractAffil.placeholder = t('step.extract.affil_placeholder');

  const customField = document.getElementById('customField');
  if (customField) customField.placeholder = t('step.field.custom_placeholder');

  const msgInput = document.getElementById('messageInput');
  if (msgInput) msgInput.placeholder = t('input.placeholder');

  const settingsBgInfo = document.getElementById('settingsBgInfo');
  if (settingsBgInfo && !settingsBgInfo.querySelector('.file-info')) {
    settingsBgInfo.innerHTML = '<div style="font-size:13px;color:var(--ink-4);padding:10px 0">' + t('settings.bg_none') + '</div>';
  }

  const statusText = document.getElementById('statusText');
  const dot = document.getElementById('statusDot');
  if (statusText && (!state.isInterviewing && dot && dot.className === 'dot')) {
    statusText.textContent = t('status.ready');
  }

  // Dispatch event so listeners can re-render (replaces direct loadPersonas() call)
  window.dispatchEvent(new CustomEvent('languagechanged'));
}

function t(key, vars = {}) {
  const lang = getLanguage();
  let text = _lang[lang]?.[key];
  if (text === undefined) text = _lang['zh']?.[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace('${' + k + '}', v);
  }
  return text;
}

export { _lang, getLanguage, setLanguage, toggleLanguage, applyLanguage, t };
