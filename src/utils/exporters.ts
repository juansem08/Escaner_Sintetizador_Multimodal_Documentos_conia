import { getLocales } from 'expo-localization';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import type { TFunction } from '../i18n/strings';
import type { DocumentAnalysis, Insights } from '../types';
import { buildWorkbookBase64 } from './excel';
import { analysisToText, fileSlug } from './exportText';

// ---------------------------------------------------------------------------
// Texto plano
// ---------------------------------------------------------------------------

export async function shareAsText(a: DocumentAnalysis, t: TFunction) {
  await Share.share({ title: a.title, message: analysisToText(a, t) });
}

// ---------------------------------------------------------------------------
// PDF (HTML → PDF con expo-print)
// ---------------------------------------------------------------------------

