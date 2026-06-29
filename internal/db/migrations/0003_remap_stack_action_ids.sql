-- +goose Up
-- Heal already-seeded databases: the original starter-stack seed wrote camelCase
-- action IDs that do not exist in the v3 catalog (internal/prompts/v3/catalog.go),
-- so every saved step was dropped by StackHandler.filterUnknownSteps. This remaps
-- each stale camelCase ID to its valid v3 dotted ID. The mapping is 1:1 and global
-- so it is fully reversible by the Down section below.
-- +goose StatementBegin
UPDATE stack_steps SET action_id = 'rewrite.proofread.basic'        WHERE action_id = 'basicProofreading';
UPDATE stack_steps SET action_id = 'rewrite.proofread.enhanced'     WHERE action_id = 'enhancedProofreading';
UPDATE stack_steps SET action_id = 'rewrite.proofread.clarification' WHERE action_id = 'clarify';
UPDATE stack_steps SET action_id = 'rewrite.intent.concise'         WHERE action_id = 'conciseRewrite';
UPDATE stack_steps SET action_id = 'rewrite.intent.simplify'        WHERE action_id = 'simplify';
UPDATE stack_steps SET action_id = 'rewrite.intent.professionalize' WHERE action_id = 'formal';
UPDATE stack_steps SET action_id = 'rewrite.tone.professional'      WHERE action_id = 'professional';
UPDATE stack_steps SET action_id = 'rewrite.tone.friendly'         WHERE action_id = 'friendly';
UPDATE stack_steps SET action_id = 'rewrite.tone.direct'           WHERE action_id = 'direct';
UPDATE stack_steps SET action_id = 'rewrite.tone.neutral'          WHERE action_id = 'neutral';
UPDATE stack_steps SET action_id = 'rewrite.tone.respectful'       WHERE action_id = 'respectful';
UPDATE stack_steps SET action_id = 'rewrite.tone.diplomatic'       WHERE action_id = 'diplomatic';
UPDATE stack_steps SET action_id = 'rewrite.tone.empathetic'       WHERE action_id = 'empathetic';
UPDATE stack_steps SET action_id = 'rewrite.style.risk-reduce'     WHERE action_id = 'riskFreeRewrite';
UPDATE stack_steps SET action_id = 'rewrite.style.technical'       WHERE action_id = 'technical';
UPDATE stack_steps SET action_id = 'rewrite.style.support'         WHERE action_id = 'customerFacing';
UPDATE stack_steps SET action_id = 'structure.format.headings'     WHERE action_id = 'documentStructuring';
UPDATE stack_steps SET action_id = 'structure.format.numbered'     WHERE action_id = 'listConversion';
UPDATE stack_steps SET action_id = 'structure.format.bullets'      WHERE action_id = 'bulletConversion';
UPDATE stack_steps SET action_id = 'summarize.executive'          WHERE action_id = 'executiveBLUF';
UPDATE stack_steps SET action_id = 'summarize.keypoints'          WHERE action_id = 'keyPoints';
UPDATE stack_steps SET action_id = 'structure.doc.email'          WHERE action_id = 'emailTemplate';
UPDATE stack_steps SET action_id = 'structure.doc.techspec'       WHERE action_id = 'specificationDocumentGenerator';
UPDATE stack_steps SET action_id = 'structure.doc.changelog'      WHERE action_id = 'changelog';
UPDATE stack_steps SET action_id = 'structure.doc.userstory'      WHERE action_id = 'userStoryGeneration';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE stack_steps SET action_id = 'basicProofreading'              WHERE action_id = 'rewrite.proofread.basic';
UPDATE stack_steps SET action_id = 'enhancedProofreading'           WHERE action_id = 'rewrite.proofread.enhanced';
UPDATE stack_steps SET action_id = 'clarify'                        WHERE action_id = 'rewrite.proofread.clarification';
UPDATE stack_steps SET action_id = 'conciseRewrite'                WHERE action_id = 'rewrite.intent.concise';
UPDATE stack_steps SET action_id = 'simplify'                       WHERE action_id = 'rewrite.intent.simplify';
UPDATE stack_steps SET action_id = 'formal'                         WHERE action_id = 'rewrite.intent.professionalize';
UPDATE stack_steps SET action_id = 'professional'                  WHERE action_id = 'rewrite.tone.professional';
UPDATE stack_steps SET action_id = 'friendly'                      WHERE action_id = 'rewrite.tone.friendly';
UPDATE stack_steps SET action_id = 'direct'                        WHERE action_id = 'rewrite.tone.direct';
UPDATE stack_steps SET action_id = 'neutral'                       WHERE action_id = 'rewrite.tone.neutral';
UPDATE stack_steps SET action_id = 'respectful'                    WHERE action_id = 'rewrite.tone.respectful';
UPDATE stack_steps SET action_id = 'diplomatic'                    WHERE action_id = 'rewrite.tone.diplomatic';
UPDATE stack_steps SET action_id = 'empathetic'                    WHERE action_id = 'rewrite.tone.empathetic';
UPDATE stack_steps SET action_id = 'riskFreeRewrite'              WHERE action_id = 'rewrite.style.risk-reduce';
UPDATE stack_steps SET action_id = 'technical'                     WHERE action_id = 'rewrite.style.technical';
UPDATE stack_steps SET action_id = 'customerFacing'               WHERE action_id = 'rewrite.style.support';
UPDATE stack_steps SET action_id = 'documentStructuring'          WHERE action_id = 'structure.format.headings';
UPDATE stack_steps SET action_id = 'listConversion'              WHERE action_id = 'structure.format.numbered';
UPDATE stack_steps SET action_id = 'bulletConversion'            WHERE action_id = 'structure.format.bullets';
UPDATE stack_steps SET action_id = 'executiveBLUF'                WHERE action_id = 'summarize.executive';
UPDATE stack_steps SET action_id = 'keyPoints'                    WHERE action_id = 'summarize.keypoints';
UPDATE stack_steps SET action_id = 'emailTemplate'               WHERE action_id = 'structure.doc.email';
UPDATE stack_steps SET action_id = 'specificationDocumentGenerator' WHERE action_id = 'structure.doc.techspec';
UPDATE stack_steps SET action_id = 'changelog'                    WHERE action_id = 'structure.doc.changelog';
UPDATE stack_steps SET action_id = 'userStoryGeneration'         WHERE action_id = 'structure.doc.userstory';
-- +goose StatementEnd
