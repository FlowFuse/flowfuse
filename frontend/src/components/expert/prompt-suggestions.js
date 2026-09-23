/**
 * Conversation starters offered above the Expert composer.
 *
 * Three are drawn at random each time a conversation starts. Add or remove
 * entries here; nothing else needs to change.
 *
 * - `title`  the line the user reads
 * - `prompt` the text handed to the Expert
 * - `needsInput` the prompt is incomplete on its own, so clicking it fills the
 *   composer and waits for the user to finish the sentence rather than sending
 */
export const PROMPT_SUGGESTIONS = [
    // Getting something out of MCP and Insights
    {
        title: 'Expose one thing over MCP',
        prompt: 'I haven\'t exposed anything over MCP yet. Pick the single easiest thing in my flows to start with, build it with me, and show me asking Insights about it afterwards.'
    },
    {
        title: 'Make my data queryable',
        prompt: 'Look through my flows and find the data that would be worth asking questions about. Show me how to expose it as an MCP resource so Insights can read it.'
    },
    {
        title: 'Turn a flow into a tool',
        prompt: 'Pick a flow of mine that does something useful on demand and help me expose it as an MCP tool with a proper input schema, so Insights can run it for me.'
    },
    {
        title: 'Check my MCP setup',
        prompt: 'Review the MCP servers my team has registered. Tell me what\'s offline, unreachable or misconfigured, and what to fix first.'
    },
    {
        title: 'Make my tools easier for the agent to use',
        prompt: 'Review the names, titles, descriptions and input schemas on my MCP tools and resources, and rewrite the ones that would confuse an agent trying to pick between them. Then check the read only and destructive hints are honest.'
    },
    {
        title: 'What can Insights do for me?',
        prompt: 'Explain what Insights mode is, look at what my team exposes over MCP today, and tell me what I could usefully ask it right now.'
    },

    // Instance and flow improvements
    {
        title: 'Upgrade Node-RED and my plugins',
        prompt: 'Check the Node-RED version and the packages installed on my instances. Tell me what\'s out of date or has a known advisory, and walk me through updating them.'
    },
    {
        title: 'How\'s my instance doing?',
        prompt: 'Look at CPU and memory on my instances, check the logs for anything repeating, and tell me whether anything needs attention.'
    },
    {
        title: 'Find the errors I\'m ignoring',
        prompt: 'Go through my instance logs for the last day, tell me which errors keep coming back, and help me fix the flow causing them.'
    },
    {
        title: 'Catch failures before they find me',
        prompt: 'Find the parts of my flows with no error handling and add catch and status handling where it actually matters.'
    },
    {
        title: 'Get my secrets out of my flows',
        prompt: 'Find hardcoded credentials, hostnames and API keys in my flows and move them into environment variables.'
    },
    {
        title: 'What\'s installed that I don\'t use?',
        prompt: 'List the packages on this instance that no flow actually uses, so I can drop them.'
    },
    {
        title: 'Why did this change?',
        prompt: 'Show me what changed on this instance recently, who did it, and what the flows looked like before.'
    },

    // Backups and change control
    {
        title: 'Am I backed up?',
        prompt: 'Check when my instances were last snapshotted, and take one for me before I start changing things.'
    },
    {
        title: 'Turn on automatic snapshots',
        prompt: 'Set up automatic snapshots on my instances and devices so there\'s always something recent to roll back to.'
    },
    {
        title: 'Stop editing production',
        prompt: 'I make changes directly on the instance that\'s running. Show me how a DevOps pipeline would work for my setup and set one up with me.'
    },
    {
        title: 'What happened across my team this week?',
        prompt: 'Summarise my team\'s audit log for the last week: deploys, member changes, anything that looks unusual.'
    },

    // Fleet and devices
    {
        title: 'Onboard a new device',
        prompt: 'Walk me through connecting a new remote instance, including the provisioning token, and assign it to the right application.'
    },
    {
        title: 'Stop updating devices one by one',
        prompt: 'Group my remote instances and show me how to roll a single snapshot out to all of them at once.'
    },
    {
        title: 'Which devices are drifting?',
        prompt: 'Compare every device against its target snapshot and tell me which ones aren\'t running what they should be.'
    },
    {
        title: 'What\'s actually running out there?',
        prompt: 'Give me a rundown of every instance and device in my team: what\'s online, what\'s behind, what\'s drifted.'
    },
    {
        title: 'What am I running?',
        prompt: 'Pull the bill of materials for my team and tell me which packages are behind or carry an advisory.'
    },

    // Instance setup and sizing
    {
        title: 'Am I on the right size?',
        prompt: 'Look at how much CPU and memory my instances really use and tell me whether I should move to a different instance type.'
    },
    {
        title: 'Start from something that works',
        prompt: 'Show me the blueprints available to me and create an instance from the one that fits what I\'m trying to build.'
    },
    {
        title: 'Same settings on every instance',
        prompt: 'I configure every new instance by hand. Show me instance templates and set one up with my defaults.'
    },
    {
        title: 'What\'s on disk?',
        prompt: 'List the files this instance has written to persistent storage and tell me what\'s taking up the space.'
    },

    // Data and integrations
    {
        title: 'Somewhere better than context storage',
        prompt: 'My flow keeps its data in context. Move it into FlowFuse Tables and rework the flow to use it.'
    },
    {
        title: 'Answer this from my tables',
        prompt: 'Look at what\'s in my FlowFuse Tables and answer this: ',
        needsInput: true
    },
    {
        title: 'Use the broker I already have',
        prompt: 'Show me the topics on my team broker, including the ones nothing listens to, and help me build a flow off one of them.'
    },
    {
        title: 'Use our own nodes',
        prompt: 'Show me the packages in our team node repository and install the right one on this instance.'
    },
    {
        title: 'Put this on a dashboard',
        prompt: 'Take the data this flow produces and build me a Dashboard 2.0 page for it.'
    },
    {
        title: 'Share this with my team',
        prompt: 'This flow is worth reusing. Put it in the team library so the rest of my team can pull it in.'
    },

    // People and access
    {
        title: 'Who has access to what?',
        prompt: 'List everyone in my team with their role, and flag anyone who has more access than they need.'
    },
    {
        title: 'Lock down my HTTP endpoints',
        prompt: 'List the HTTP endpoints my flows expose and help me put authentication in front of them.'
    },

    // Usage and housekeeping
    {
        title: 'Am I near my limits?',
        prompt: 'Compare what my team uses against the limits of my team type, and tell me what happens when I hit them.'
    },
    {
        title: 'What have I missed?',
        prompt: 'Go through my FlowFuse notifications and tell me which ones still need something from me.'
    },
    {
        title: 'Find it for me',
        prompt: 'Find the instance that has the flow doing this: ',
        needsInput: true
    }
]

/**
 * Draw `count` distinct suggestions at random.
 * @param {number} [count]
 * @param {Array} [pool]
 */
export function pickSuggestions (count = 3, pool = PROMPT_SUGGESTIONS) {
    const remaining = [...pool]
    const picked = []
    while (picked.length < count && remaining.length > 0) {
        picked.push(...remaining.splice(Math.floor(Math.random() * remaining.length), 1))
    }
    return picked
}

export default PROMPT_SUGGESTIONS
