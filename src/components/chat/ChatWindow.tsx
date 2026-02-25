'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { conversationSteps, getStepById, getNextStep } from '@/lib/conversation';
import { ChatMessage, ConversationAnswers, ConversationOption, CarrierQuote } from '@/lib/types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import OptionButtons from './OptionButtons';
import TextInput from './TextInput';
import RateCard from './RateCard';
import ProgressBar from './ProgressBar';
import ConsentCheckbox from './ConsentCheckbox';
import PhoneCTA from './PhoneCTA';
import VerifyCodeInput from './VerifyCodeInput';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const TYPING_DELAY = 800;
const DEFAULT_TERM = 20;
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
            term: String(DEFAULT_TERM),
          });
          const res = await fetch(`/api/rates?${params}`);
          const data = await res.json();
          setRates(data.quotes || []);
          addBotMessage(messageText, step, data.quotes || []);
        } catch {
          addBotMessage('I had trouble looking up rates. Let me connect you with an agent who can help directly.', step, []);
        }
        setCurrentStepId(stepId);
        await new Promise((r) => setTimeout(r, 1500));
        const nextId = getNextStep(stepId, currentAnswers, '');
        processStep(nextId, currentAnswers);
        return;
      }

      // Handle phone_cta step
      if (step.inputType === 'phone_cta') {
        addBotMessage(messageText);
        const ctaMsg: ChatMessage = {
          id: `cta-${Date.now()}-${Math.random()}`,
          sender: 'bot',
          text: '',
          timestamp: Date.now(),
          inputType: 'phone_cta',
        };
        setMessages((prev) => [...prev, ctaMsg]);
        setCurrentStepId(stepId);
        setConversationDone(true);
        return;
      }

      // Handle verify_code step - send SMS then show input
      if (step.inputType === 'verify_code') {
        // Send verification SMS
        try {
          await fetch('/api/verify/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: currentAnswers.phone }),
          });
        } catch {
          console.error('Failed to send verification SMS');
        }

        const msg: ChatMessage = {
          id: `bot-${Date.now()}-${Math.random()}`,
          sender: 'bot',
          text: messageText,
          timestamp: Date.now(),
          inputType: 'verify_code',
        };
        setMessages((prev) => [...prev, msg]);
        setCurrentStepId(stepId);
        setInputDisabled(false);
        return;
      }

      // Handle auto-advance steps
      if (step.inputType === 'auto') {
        addBotMessage(messageText);
        // Submit lead during calculating step
        if (stepId === 'calculating') {
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
          termLength: DEFAULT_TERM,
          householdIncome: currentAnswers.income || '',
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

      // Fire Meta Pixel events
      if (typeof window.fbq === 'function') {
        // Always fire Lead event for every submission
        window.fbq('track', 'Lead');

        // Fire QualifiedLead only for premium/standard tier leads
        const age = parseInt(currentAnswers.age, 10);
        const isQualifiedAge = age >= 35 && age <= 55;
        const isNonSmoker = currentAnswers.smoker === 'never' || currentAnswers.smoker === 'former';
        const hasHighCoverage = parseInt(currentAnswers.coverage, 10) >= 250000;
        const hasHighIncome = ['50k_75k', '75k_100k', 'over_100k'].includes(currentAnswers.income);

        if (isQualifiedAge && isNonSmoker && hasHighCoverage && hasHighIncome) {
          window.fbq('trackCustom', 'QualifiedLead');
        }
      }
    } catch {
      console.error('Failed to submit lead');
    }
  };

  // Inline option selection
  const handleInlineSelect = (msgId: string, value: string, label: string) => {
    if (inputDisabled) return;
    setInputDisabled(true);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, selectedValue: value, selectedLabel: label } : m
      )
    );

    const newAnswers = { ...answers, [currentStepId]: value };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);

    const nextId = getNextStep(currentStepId, newAnswers, value);
    setTimeout(() => processStep(nextId, newAnswers), 400);
  };

  // Inline text input submission
  const handleInlineTextSubmit = (msgId: string, value: string) => {
    const step = getStepById(currentStepId);
    if (!step || inputDisabled) return;

    if (step.validation) {
      const error = step.validation(value, answers);
      if (error) {
        addBotMessage(error);
        return;
      }
    }

    setInputDisabled(true);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, selectedValue: value, selectedLabel: value } : m
      )
    );

    const newAnswers = { ...answers, [currentStepId]: value };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);

    const nextId = getNextStep(currentStepId, newAnswers, value);
    setTimeout(() => processStep(nextId, newAnswers), 300);
  };

  // Inline consent submission
  const handleInlineConsent = (msgId: string, consented: boolean, text: string) => {
    if (!consented) return;
    setInputDisabled(true);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, selectedValue: 'true', selectedLabel: 'I consent' } : m
      )
    );

    const newAnswers = { ...answers, consent: 'true', consent_text: text };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);

    const nextId = getNextStep(currentStepId, newAnswers, 'true');
    setTimeout(() => processStep(nextId, newAnswers), 300);
  };

  // Phone verification success
  const handleVerifyCode = (msgId: string, code: string) => {
    setInputDisabled(true);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, selectedValue: code, selectedLabel: 'Verified' } : m
      )
    );

    const newAnswers = { ...answers, phone_verify: code };
    setAnswers(newAnswers);
    setStepsCompleted((prev) => prev + 1);

    const nextId = getNextStep(currentStepId, newAnswers, code);
    setTimeout(() => processStep(nextId, newAnswers), 300);
  };

  // User wants to change their phone number
  const handleChangeNumber = () => {
    setInputDisabled(false);
    processStep('phone', answers);
  };

  const inputTypeMap: Record<string, 'text' | 'number' | 'email' | 'tel'> = {
    text: 'text',
    number: 'number',
    email: 'email',
    phone: 'tel',
  };

  const getPlaceholder = (inputType: string) => {
    switch (inputType) {
      case 'number': return 'Enter your age...';
      case 'email': return 'your@email.com';
      case 'phone': return '(555) 123-4567';
      default: return 'Type here...';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <ProgressBar current={stepsCompleted} total={TOTAL_STEPS} />

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-4 pb-[env(safe-area-inset-bottom,24px)] flex flex-col justify-start">
          <div className="w-full max-w-lg mx-auto">
            {/* Sticky Melissa avatar */}
            <div className="sticky top-0 z-20 pt-4 pb-3 bg-white">
              <div className="flex flex-col items-center">
                <img
                  src="/melissa-avatar.jpg"
                  alt="Melissa"
                  className="w-14 h-14 rounded-full object-cover shadow-md ring-2 ring-white"
                />
                <span className="mt-1.5 text-xs font-medium text-gray-500">Melissa</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none" />
            </div>

            {messages.map((msg) => (
              <div key={msg.id}>
                {/* Phone CTA inline */}
                {msg.inputType === 'phone_cta' && !msg.text && (
                  <div className="ml-10">
                    <PhoneCTA />
                  </div>
                )}

                {msg.text && <MessageBubble sender={msg.sender} text={msg.text} />}
                {msg.rates && msg.rates.length > 0 && <RateCard quotes={msg.rates} />}

                {/* Inline options */}
                {msg.options && msg.inputType === 'options' && (
                  <div className="ml-10">
                    <OptionButtons
                      options={msg.options}
                      onSelect={(value, label) => handleInlineSelect(msg.id, value, label)}
                      selectedValue={msg.selectedValue}
                    />
                  </div>
                )}

                {/* Inline text/number/email/phone input */}
                {msg.inputType && ['text', 'number', 'email', 'phone'].includes(msg.inputType) && (
                  <div className="ml-10">
                    {msg.selectedValue ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className="flex justify-end mb-4 mt-1"
                      >
                        <div className="px-4 py-2.5 rounded-2xl bg-slate-700 text-white text-[14px] font-medium rounded-br-md">
                          {msg.selectedLabel}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="mt-2 mb-4">
                        <TextInput
                          type={inputTypeMap[msg.inputType] || 'text'}
                          placeholder={getPlaceholder(msg.inputType)}
                          onSubmit={(value) => handleInlineTextSubmit(msg.id, value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Inline verify code */}
                {msg.inputType === 'verify_code' && (
                  <div className="ml-10">
                    {msg.selectedValue ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className="flex justify-end mb-4 mt-1"
                      >
                        <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-[14px] font-medium rounded-br-md">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M3 8l3.5 3.5L13 5" />
                          </svg>
                          Verified
                        </div>
                      </motion.div>
                    ) : (
                      <div className="mt-2">
                        <VerifyCodeInput
                          phone={answers.phone || ''}
                          onVerified={(code) => handleVerifyCode(msg.id, code)}
                          onChangeNumber={handleChangeNumber}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Inline consent */}
                {msg.inputType === 'consent' && (
                  <div className="ml-10">
                    {msg.selectedValue ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className="flex justify-end mb-4 mt-1"
                      >
                        <div className="px-4 py-2.5 rounded-2xl bg-slate-700 text-white text-[14px] font-medium rounded-br-md">
                          I consent
                        </div>
                      </motion.div>
                    ) : (
                      <div className="mt-2 mb-4">
                        <ConsentCheckbox onConsent={(consented, text) => handleInlineConsent(msg.id, consented, text)} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
