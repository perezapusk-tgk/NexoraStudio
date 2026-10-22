import React from 'react'
import { createRoot } from 'react-dom/client'
import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import {
  LayoutDashboard, FolderKanban, Inbox, Users, CalendarDays, Globe2,
  Smartphone, BarChart3, Plug, Zap, Settings, Plus, Search, Bell,
  ArrowUpRight, MoreHorizontal, ChevronRight, CheckCircle2, Clock3,
  CircleDollarSign, ExternalLink, Filter, Send, CreditCard, Palette,
  ShieldCheck, Bot, Sparkles, X, Menu, LogOut, UserRound, Layers3, Receipt, ShoppingCart
} from 'lucide-react'
import './styles.css'
import { getLanguage, setLanguage, getCurrency, setCurrency, installLanguageObserver } from './i18n'
