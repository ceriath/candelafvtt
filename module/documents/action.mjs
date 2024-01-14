/**
 * Base Action Class
 */
export class Action {
    /**
     * Roll an action
     * @param {any} action   The actual action object
     * @param {string} actionId The key id of the action
     */
    static async rollAction(action, actionId) {
        const drives = await this._prepareActionRoll(actionId);
        if (drives == null) return; // dialog canceled

        const diceCount = action.value + drives;
        let r;

        if (diceCount == 0) {
            // no action rating, roll two dice and keep lower result
            const normalDice = new Die({
                number: 2,
                faces: 6,
                modifiers: ['kl'],
            });
            r = Roll.fromTerms([normalDice]);
        } else if (action.gilded) {
            // gilded action, replace one die with a gilded die
            const normalDice = new Die({
                number: diceCount - 1,
                faces: 6,
                modifiers: ['kh'],
            });
            const plus = new OperatorTerm({ operator: '+' });
            const gildedDice = new Die({
                number: 1,
                faces: 6,
                options: { flavor: 'gilded' },
                modifiers: ['kh'],
            });
            r = Roll.fromTerms([normalDice, plus, gildedDice]);
        } else {
            // normal roll
            const normalDice = new Die({ number: diceCount, faces: 6 });
            r = Roll.fromTerms([normalDice]);
        }

        await r.evaluate();

        // construct chat message
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');
        const label = `[action] ${actionId}`;
        const content = await renderTemplate('systems/candelafvtt/templates/chat/roll.hbs', r);

        const msg = {
            content: content,
            speaker: speaker,
            rollMode: rollMode,
            flavor: label,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            rolls: [r],
        };

        AudioHelper.play({ src: 'sounds/dice.wav', volume: 0.8, autoplay: true, loop: false }, true);
        // post to chat
        CONFIG.ChatMessage.documentClass.create(msg, {});

        return r;
    }

    /**
     * Prepare a roll by getting necessary information via user dialog
     * @param {string} actionId The key id of the action
     * @private
     */
    static async _prepareActionRoll(actionId) {
        let title = actionId;
        let content = await renderTemplate('systems/candelafvtt/templates/chat/roll-dialog.hbs');
        let options = {};

        return new Promise(resolve => {
            new Dialog(
                {
                    title,
                    content,
                    buttons: {
                        roll: {
                            label: game.i18n.localize('CANDELAFVTT.roll'),
                            callback: html => resolve(this._onRollDialogSubmit(html)),
                        },
                    },
                    default: 'roll',
                    close: () => resolve(null),
                },
                options
            ).render(true);
        });
    }

    /**
     * Read the drives from the submitted form
     * @param {html} html The submitted html containing the form
     * @private
     */
    static async _onRollDialogSubmit(html) {
        const form = html[0].querySelector('form');
        const drives = parseInt(form.drives.value);
        return drives;
    }
}
