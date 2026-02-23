import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Shield, User, Brain, MessageSquare, Bell, Keyboard, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SettingsOverlayProps {
  open: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onSetTheme: (theme: 'light' | 'dark') => void;
}

export function SettingsOverlay({ open, onClose, theme, onSetTheme }: SettingsOverlayProps) {
  const [activeTab, setActiveTab] = useState('language');
  const [language, setLanguage] = useState('en');
  
  // Privacy settings
  const [allowPromptTraining, setAllowPromptTraining] = useState(false);
  const [allowChatHistory, setAllowChatHistory] = useState(true);
  const [saveConversations, setSaveConversations] = useState(true);
  
  // Personalization
  const [aboutMe, setAboutMe] = useState('');
  const [profession, setProfession] = useState('');
  const [interests, setInterests] = useState('');
  
  // Memory
  const [longTermMemory, setLongTermMemory] = useState(true);
  const [rememberPreferences, setRememberPreferences] = useState(true);
  const [contextWindow, setContextWindow] = useState('medium');
  
  // Communication style
  const [communicationStyle, setCommunicationStyle] = useState('balanced');
  const [responseLength, setResponseLength] = useState('medium');
  const [formality, setFormality] = useState('neutral');
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  
  // Accessibility
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  if (!open) return null;

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
  ];

  const settingsSections = [
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'personalization', label: 'Personalization', icon: User },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'accessibility', label: 'Accessibility', icon: Keyboard },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background animate-in fade-in-0 duration-200">
      <div className="flex flex-col h-screen max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h1 className="text-xl font-semibold">Settings</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-56 shrink-0 border-r border-border p-4 space-y-1 overflow-y-auto">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  activeTab === section.id 
                    ? "bg-secondary text-foreground" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Language */}
            {activeTab === 'language' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Language Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Interface Language</label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Choose the language for the interface. AI responses will adapt accordingly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Privacy & Data</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Use prompts for model improvement</label>
                      <p className="text-sm text-muted-foreground">
                        Allow your prompts to be used to improve AI models
                      </p>
                    </div>
                    <Switch checked={allowPromptTraining} onCheckedChange={setAllowPromptTraining} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Use chat history for improvement</label>
                      <p className="text-sm text-muted-foreground">
                        Allow your conversation history to improve responses
                      </p>
                    </div>
                    <Switch checked={allowChatHistory} onCheckedChange={setAllowChatHistory} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Save conversations</label>
                      <p className="text-sm text-muted-foreground">
                        Store your conversations for future reference
                      </p>
                    </div>
                    <Switch checked={saveConversations} onCheckedChange={setSaveConversations} />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      Delete all conversation data
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Personalization */}
            {activeTab === 'personalization' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Personalization</h2>
                <div className="space-y-6">
                  {/* Theme */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Theme</label>
                    <div className="flex gap-3">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        className="flex-1 gap-2"
                        onClick={() => onSetTheme('light')}
                      >
                        <Sun className="h-4 w-4" />
                        Light
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        className="flex-1 gap-2"
                        onClick={() => onSetTheme('dark')}
                      >
                        <Moon className="h-4 w-4" />
                        Dark
                      </Button>
                    </div>
                  </div>

                  {/* About Me */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">About Me</label>
                    <Textarea
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      placeholder="Tell the AI about yourself to get more personalized responses..."
                      className="min-h-24"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      This information helps AI provide more relevant responses.
                    </p>
                  </div>

                  {/* Profession */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Profession / Role</label>
                    <Input
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="e.g., Software Developer, Designer, Student..."
                    />
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Interests & Topics</label>
                    <Input
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      placeholder="e.g., Technology, Art, Science, Music..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Memory */}
            {activeTab === 'memory' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Memory Settings</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Long-term memory</label>
                      <p className="text-sm text-muted-foreground">
                        Remember important information across conversations
                      </p>
                    </div>
                    <Switch checked={longTermMemory} onCheckedChange={setLongTermMemory} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Remember preferences</label>
                      <p className="text-sm text-muted-foreground">
                        Save your formatting and style preferences
                      </p>
                    </div>
                    <Switch checked={rememberPreferences} onCheckedChange={setRememberPreferences} />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Context window size</label>
                    <Select value={contextWindow} onValueChange={setContextWindow}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (faster, less context)</SelectItem>
                        <SelectItem value="medium">Medium (balanced)</SelectItem>
                        <SelectItem value="large">Large (more context, slower)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Larger context allows AI to remember more of the conversation.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button variant="outline">
                      Clear memory
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      This will reset all learned preferences and saved information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Communication */}
            {activeTab === 'communication' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Communication Style</h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Response style</label>
                    <Select value={communicationStyle} onValueChange={setCommunicationStyle}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise & Direct</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="detailed">Detailed & Explanatory</SelectItem>
                        <SelectItem value="creative">Creative & Expressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Response length</label>
                    <Select value={responseLength} onValueChange={setResponseLength}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="adaptive">Adaptive (based on question)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Formality level</label>
                    <Select value={formality} onValueChange={setFormality}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual & Friendly</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="formal">Formal & Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Notifications</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Email notifications</label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates and news via email
                      </p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Push notifications</label>
                      <p className="text-sm text-muted-foreground">
                        Get browser notifications for important updates
                      </p>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>
                </div>
              </div>
            )}

            {/* Accessibility */}
            {activeTab === 'accessibility' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">Accessibility</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Reduce motion</label>
                      <p className="text-sm text-muted-foreground">
                        Minimize animations and transitions
                      </p>
                    </div>
                    <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">High contrast</label>
                      <p className="text-sm text-muted-foreground">
                        Increase contrast for better visibility
                      </p>
                    </div>
                    <Switch checked={highContrast} onCheckedChange={setHighContrast} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
