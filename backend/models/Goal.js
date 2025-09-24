const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    name: {
        type: String,
        required: [true, 'Goal name is required'],
        maxlength: [100, 'Goal name cannot be more than 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    category: {
        type: String,
        enum: [
            'emergency_fund', 'vacation', 'car', 'house', 'education',
            'retirement', 'wedding', 'business', 'investment', 'debt_payoff', 'other'
        ],
        default: 'other'
    },
    targetAmount: {
        type: Number,
        required: [true, 'Target amount is required'],
        min: [0, 'Target amount cannot be negative']
    },
    currentAmount: {
        type: Number,
        default: 0,
        min: [0, 'Current amount cannot be negative']
    },
    targetDate: {
        type: Date,
        required: [true, 'Target date is required']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'paused', 'cancelled'],
        default: 'active'
    },
    // Monthly contribution settings
    monthlyContribution: {
        type: Number,
        default: 0,
        min: [0, 'Monthly contribution cannot be negative']
    },
    autoDeduct: {
        type: Boolean,
        default: false
    },
    // Progress tracking
    progress: {
        percentComplete: { type: Number, default: 0 },
        monthsRemaining: { type: Number, default: 0 },
        requiredMonthly: { type: Number, default: 0 },
        isOnTrack: { type: Boolean, default: true }
    },
    // Goal image/icon
    icon: {
        type: String,
        default: 'target'
    },
    color: {
        type: String,
        default: '#667eea'
    },
    // Milestones
    milestones: [{
        name: String,
        amount: Number,
        targetDate: Date,
        completed: { type: Boolean, default: false },
        completedDate: Date
    }],
    // Notes and updates
    notes: [{
        content: String,
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['note', 'milestone', 'contribution'], default: 'note' }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, priority: 1 });
goalSchema.index({ userId: 1, targetDate: 1 });

// Virtual for remaining amount
goalSchema.virtual('remainingAmount').get(function () {
    return Math.max(0, this.targetAmount - this.currentAmount);
});

// Virtual for completion percentage
goalSchema.virtual('completionPercent').get(function () {
    if (this.targetAmount === 0) return 0;
    return (this.currentAmount / this.targetAmount) * 100;
});

// Virtual for days remaining
goalSchema.virtual('daysRemaining').get(function () {
    const now = new Date();
    const diffTime = this.targetDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for required monthly contribution to meet target
goalSchema.virtual('requiredMonthlyContribution').get(function () {
    const monthsRemaining = Math.max(1, this.daysRemaining / 30);
    const remainingAmount = this.remainingAmount;
    return remainingAmount / monthsRemaining;
});

// Pre-save middleware to calculate progress
goalSchema.pre('save', function (next) {
    // Calculate completion percentage
    if (this.targetAmount > 0) {
        this.progress.percentComplete = (this.currentAmount / this.targetAmount) * 100;
    }

    // Calculate months remaining
    const now = new Date();
    const diffTime = this.targetDate - now;
    this.progress.monthsRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)));

    // Calculate required monthly contribution
    if (this.progress.monthsRemaining > 0) {
        this.progress.requiredMonthly = this.remainingAmount / this.progress.monthsRemaining;
    }

    // Check if on track
    this.progress.isOnTrack = this.monthlyContribution >= this.progress.requiredMonthly;

    // Update status if completed
    if (this.currentAmount >= this.targetAmount && this.status === 'active') {
        this.status = 'completed';
    }

    next();
});

// Instance method to add contribution
goalSchema.methods.addContribution = function (amount, note = '') {
    this.currentAmount += amount;

    // Add note about contribution
    this.notes.push({
        content: `Added Rs${amount.toLocaleString('en-IN')} ${note ? '- ' + note : ''}`,
        type: 'contribution'
    });

    return this.save();
};

// Instance method to check milestone completion
goalSchema.methods.checkMilestones = function () {
    this.milestones.forEach(milestone => {
        if (!milestone.completed && this.currentAmount >= milestone.amount) {
            milestone.completed = true;
            milestone.completedDate = new Date();

            this.notes.push({
                content: `Milestone achieved: ${milestone.name} (Rs${milestone.amount.toLocaleString('en-IN')})`,
                type: 'milestone'
            });
        }
    });

    return this.save();
};

// Instance method to get goal summary
goalSchema.methods.getSummary = function () {
    return {
        id: this._id,
        name: this.name,
        targetAmount: this.targetAmount,
        currentAmount: this.currentAmount,
        remainingAmount: this.remainingAmount,
        completionPercent: this.completionPercent,
        daysRemaining: this.daysRemaining,
        requiredMonthlyContribution: this.requiredMonthlyContribution,
        isOnTrack: this.progress.isOnTrack,
        status: this.status,
        priority: this.priority
    };
};

// Static method to get user goals
goalSchema.statics.getUserGoals = function (userId, status = 'active') {
    return this.find({ userId, status }).sort({ priority: -1, targetDate: 1 });
};

// Static method to get goals by priority
goalSchema.statics.getGoalsByPriority = function (userId, priority) {
    return this.find({ userId, priority, status: 'active' }).sort({ targetDate: 1 });
};

// Static method to get goal statistics
goalSchema.statics.getGoalStats = function (userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalTarget: { $sum: '$targetAmount' },
                totalCurrent: { $sum: '$currentAmount' }
            }
        }
    ]);
};

module.exports = mongoose.model('Goal', goalSchema);
