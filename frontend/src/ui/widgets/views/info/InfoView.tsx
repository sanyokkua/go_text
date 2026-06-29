import React, { memo, useEffect } from 'react';
import { selectAboutSection, selectSuggestedStacks, useAppDispatch, useAppSelector } from '../../../../logic/store';
import { setAboutSection } from '../../../../logic/store/about/slice';
import { fetchSuggestedStacks } from '../../../../logic/store/about/thunks';
import { AboutSection } from '../../../../logic/store/about/types';
import { MarkdownView } from '../../../components/MarkdownView';
import { StackGlyph } from '../../../components/StackGlyph';
import { Tabs } from '../../../primitives/Tabs';
import CatalogList from './CatalogList';
import styles from './InfoView.module.css';
import PromptInspector from './PromptInspector';

const GUIDE_CONTENT = `# Text Processing Suite

Transform text with AI-powered actions. Each action applies a specific transformation via a language model.

## Quick Start

1. Enter text in the editor
2. Select an action from the sidebar
3. Press **Run**

## Actions & Stacks

**Actions** are single-step transformations.
**Stacks** chain multiple actions together to build a processing pipeline.

Browse the **Actions & Stacks** tab to explore available actions and preview the exact prompts they send to the model.

## ⌘K Command Palette

Press **⌘K** (or **Ctrl+K** on Windows/Linux) from anywhere in the app to open the command palette.
- **↵** to run an action immediately
- **⇧↵** to add the action to the current stack
`;

const InfoView: React.FC = memo(function InfoView() {
    const dispatch = useAppDispatch();
    const section = useAppSelector(selectAboutSection);
    const suggestedStacks = useAppSelector(selectSuggestedStacks);

    useEffect(() => {
        if (suggestedStacks.length === 0) {
            dispatch(fetchSuggestedStacks());
        }
    }, [dispatch, suggestedStacks.length]);

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <h1 className={styles.title}>Text Processing Suite</h1>
                <p className={styles.subtitle}>AI-powered text transformations</p>
            </header>

            <div className={styles.tabsWrapper}>
                <Tabs
                    value={section}
                    onValueChange={(v) => dispatch(setAboutSection(v as AboutSection))}
                    orientation="vertical"
                    tabs={[
                        {
                            value: 'guide',
                            label: 'Guide',
                            content: (
                                <div className={styles.guideContent}>
                                    <MarkdownView source={GUIDE_CONTENT} />
                                    {suggestedStacks.length > 0 && (
                                        <section className={styles.suggestions} aria-label="Suggested stacks">
                                            <h2 className={styles.suggestionsTitle}>Suggested stacks</h2>
                                            <p className={styles.suggestionsHint}>Ideas to build your own multi-step pipelines.</p>
                                            <ul className={styles.suggestionList}>
                                                {suggestedStacks.map((s) => (
                                                    <li key={s.name} className={styles.suggestionRow}>
                                                        <StackGlyph icon={s.icon} className={styles.suggestionIcon} />
                                                        <div className={styles.suggestionBody}>
                                                            <span className={styles.suggestionName}>{s.name}</span>
                                                            <div className={styles.suggestionActions}>
                                                                {s.actionNames.map((name, index) => (
                                                                    <span key={`${s.name}-${index}`} className={styles.suggestionChip}>
                                                                        {name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}
                                </div>
                            ),
                        },
                        {
                            value: 'actions-stacks',
                            label: 'Actions & Stacks',
                            content: (
                                <div className={styles.catalogAndInspector}>
                                    <CatalogList />
                                    <PromptInspector />
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </div>
    );
});

InfoView.displayName = 'InfoView';
export default InfoView;
