'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { conversationSteps, getStepById, getNextStep } from '@/lib/conversation';
import { ChatMessage, ConversationAnswers, ConversationOption, CarrierQuote } from '@/lib/types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import OptionButtons from './OptionButtons';
import TextInput from './TextInput';
import RateCard from './RateCard';
import ProgressBar from './ProgressBar';
import ConsentCheckbox from './ConsentCheckbox';

const TYPING_DELAY = 800;
const TOTAL_STEPS = conversationSteps.filter(
  (s) => s.inputType !== 'auto' && s.id !== 'rates_display'
).length;

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string>('welcome');
  const [answers, setAnswers] = useState<ConversationAnswers>({});
  const [isTyping, setIsTyping] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [rates, setRates] = useState<CarrierQuote[]>([]);
  const [conversationDone, setConversationDone] = useState(false);
  const [stepsCompleted, setStepsCompleted] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const utmParams = useRef<Record<string, string>>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Capture UTM params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
      utmKeys.forEach((key) => {
        const val = params.get(key);
        if (val) utmParams.current[key] = val;
      });
      utmParams.current.referrer = document.referrer || '';
      utmParams.current.landingPage = window.location.pathname;
    }
  }, []);

  const addBotMessage = useCallback(
    (text: string, step?: (typeof conversationSteps)[0], ratesData?: CarrierQuote[]) => {
      const msg: ChatMessage = {
        id: `bot-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text,
        timestamp: Date.now(),
        options: step?.options
          ? typeof step.options === 'function'
            ? undefined
            : step.options
          : undefined,
        inputType: step?.inputType,
        rates: ratesData,
      };
      setMessages((prev) => [...prev, msg]);
    },
    []
  );

  const processStep = useCallback(
    async (stepId: string, currentAnswers: ConversationAnswers) => {
      if (stepId === 'done') {
        setConversationDone(true);
        return;
      }

      const step = getStepById(stepId);
      if (!step) return;

      // Check skipIf
      if (step.skipIf && step.skipIf(currentAnswers)) {
        const nextId = getNextStep(stepId, currentAnswers, '');
        processStep(nextId, currentAnswers);
        return;
      }

      // Show typing indicator, then message
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, TYPING_DELAY));
      setIsTyping(false);

      const messageText =
        typeof step.message === 'function' ? step.message(currentAnswers) : step.message;

      // Handle rates_display step
      if (step.inputType === 'rates_display') {
        try {
          const params = new URLSearchParams({
            age: currentAnswers.age,
            gender: currentAnswers.gender,
            smoker: currentAnswers.smoker,
            health: currentAnswers.health,
            coverage: currentAnswers.coverage,
            term: currentAnswers.term,
          });
          const res = await fetch(`/api/rates?${params}`);
          const data = await res.json();
          setRates(data.quotes || []);
          addBotMessage(messageText, step, data.quotes || []);
        } catch {
          addBotMessage('I had trouble looking up rates. Let me connect you with an agent who can help directly.', step, []);
        }
        setCurrentStepId(stepId);
        // Auto-advance after showing rates
        await new Promise((r) => setTimeout(r, 1500));
        const nextId = getNextStep(stepId, currentAnswers, '');
        processStep(nextId, currentAnswers);
        return;
      }

      // Handle auto-advance steps
      if (step.inputType === 'auto') {
        addBotMessage(messageText);
        // If this is the submitting step, actually submit
        if (stepId === 'submitting') {
          await submitLead(currentAnswers);
        }
        await new Promise((r) => setTimeout(r, 1200));
        const nextId = getNextStep(stepId, currentAnswers, '');
        processStep(nextId, currentAnswers);
        return;
      }

      // Resolve dynamic options
      let resolvedOptions: ConversationOption[] | undefined;
      if (step.options) {
        resolvedOptions =
          typeof step.options === 'function' ? step.options(currentAnswers) : step.options;
      }

      const msg: ChatMessage = {
        id: `bot-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        text: messageText,
        timestamp: Date.now(),
        options: resolvedOptions,
        inputType: step.inputType,
      };
      setMessages((prev) => [...prev, msg]);
      setCurrentStepId(stepId);
      setInputDisabled(false);
    },
    [addBotMessage]
  );

  // Initialize conversation
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      processStep('welcome', {});
    }
  }, [processStep]);

  const submitLead = async (currentAnswers: ConversationAnswers) => {
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseInt(currentAnswers.age, 10),
          gender: currentAnswers.gender,
          smokerStatus: currentAnswers.smoker,
          healthClass: currentAnswers.health,
          coverageAmount: parseInt(currentAnswers.coverage, 10),
          termLength: parseInt(currentAnswers.term, 10),
          ratesShown: rates,
          firstName: currentAnswers.name,
          email: currentAnswers.email,
          phone: currentAnswers.phone,
          zip: currentAnswers.zip,
          consentGiven: true,
          consentText: currentAnswers.consent_text || '',
          ipAddress: '',
          utmSource: utmParams.current.utm_source,
          utmMedium: utmParams.current.utm_medium,
          utmCampaign: utmParams.current.utm_campaign,
          utmContent: utmParams.current.utm_content,
          utmTerm: utmParams.current.utm_term,
          gclid: utmParams.current.gclid,
          fbclid: utmParams.current.fbclid,
          referrer: utmParams.current.referrer,
          landingPage: utmParams.current.landingPage,
        }),
      });
    } catch {
      console.error('Failed to submit lead');
    }
  };

  // Handle inline option selection (Lemonade-style)
  const handleInlineSelect = (msgId: string, value: string, label: string) => {
    if (inputDisabled) return;

    setInputDisabled(true);

    // Mark the selected option on the message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, selectedValue: value, selectedLabel: label } : m
      )
    );

    // Store answer
    const newAnswers = { ...answers, [currentStepId]: value };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);

    // Process next step
    const nextId = getNextStep(currentStepId, newAnswers, value);
    setTimeout(() => processStep(nextId, newAnswers), 400);
  };

  // Handle text input responses (bottom bar)
  const handleUserResponse = (value: string, displayText?: string) => {
    const step = getStepById(currentStepId);
    if (!step || inputDisabled) return;

    // Validate
    if (step.validation) {
      const error = step.validation(value, answers);
      if (error) {
        addBotMessage(error);
        return;
      }
    }

    setInputDisabled(true);

    // Add user message bubble for text inputs
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: displayText || value,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Store answer
    const newAnswers = { ...answers, [currentStepId]: value };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);

    // Process next step
    const nextId = getNextStep(currentStepId, newAnswers, value);
    setTimeout(() => processStep(nextId, newAnswers), 300);
  };

  const handleConsent = (consented: boolean, text: string) => {
    if (!consented) return;
    const newAnswers = { ...answers, consent: 'true', consent_text: text };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);
    setInputDisabled(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'I agree',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const nextId = getNextStep(currentStepId, newAnswers, 'true');
    setTimeout(() => processStep(nextId, newAnswers), 300);
  };

  // Only show bottom bar for text inputs and consent (not options)
  const currentStep = getStepById(currentStepId);
  const showTextInput =
    currentStep &&
    ['text', 'number', 'email', 'phone'].includes(currentStep.inputType) &&
    !inputDisabled;
  const showConsent = currentStep?.inputType === 'consent' && !inputDisabled;
  const showBottomBar = !conversationDone && (showTextInput || showConsent);

  const inputTypeMap: Record<string, 'text' | 'number' | 'email' | 'tel'> = {
    text: 'text',
    number: 'number',
    email: 'email',
    phone: 'tel',
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <ProgressBar current={stepsCompleted} total={TOTAL_STEPS} />

      <div className="relative flex-1 overflow-hidden">
        {/* Top scroll fade */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10" />

        <div className="h-full overflow-y-auto px-4 py-6 flex flex-col justify-start">
          <div className="w-full max-w-lg mx-auto">
            {messages.map((msg) => (
              <div key={msg.id}>
                <MessageBubble sender={msg.sender} text={msg.text} />
                {msg.rates && msg.rates.length > 0 && <RateCard quotes={msg.rates} />}

                {/* Inline options — Lemonade style */}
                {msg.options && msg.inputType === 'options' && (
                  <div className="ml-10">
                    <OptionButtons
                      options={msg.options}
                      onSelect={(value, label) => handleInlineSelect(msg.id, value, label)}
                      selectedValue={msg.selectedValue}
                    />
                  </div>
                )}
              </div>
            ))}

            <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {showBottomBar && (
        <div className="border-t border-gray-100 px-4 py-4 pb-[env(safe-area-inset-bottom,16px)]">
          <div className="w-full max-w-lg mx-auto">
            {showTextInput && currentStep && (
              <TextInput
                type={inputTypeMap[currentStep.inputType] || 'text'}
                placeholder={
                  currentStep.inputType === 'number'
                    ? 'Enter your age...'
                    : currentStep.inputType === 'email'
                    ? 'your@email.com'
                    : currentStep.inputType === 'phone'
                    ? '(555) 123-4567'
                    : 'Type here...'
                }
                onSubmit={(value) => handleUserResponse(value)}
              />
            )}

            {showConsent && <ConsentCheckbox onConsent={handleConsent} />}
          </div>
        </div>
      )}
    </div>
  );
}
