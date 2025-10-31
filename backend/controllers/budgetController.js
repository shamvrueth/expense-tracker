import { v4 as uuidv4 } from 'uuid';
import connection from '../db.js';

// Get all budgets for a user
export async function getAllBudget(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT 
        b.budget_id,
        b.user_id,
        b.type_id,
        et.type_name,
        b.budget_name,
        b.budget_limit,
        b.budget_spent,
        b.start_date,
        b.end_date,
        b.notes
      FROM budgets b
      JOIN Expense_Types et ON b.type_id = et.type_id
      WHERE b.user_id = $1
    `;
    const { rows } = await connection.query(sql, [userid]);

    const budgets = rows.map(row => ({
      id: row.budget_id,
      name: row.budget_name,
      category: row.type_name,
      limit: Number(row.budget_limit),
      spent: Number(row.budget_spent),
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      notes: row.notes
    }));

    res.json(budgets);
  } catch (err) {
    console.error("Error fetching budgets:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get a budget by ID
export async function getBudgetById(req, res) {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        b.budget_id,
        b.user_id,
        b.type_id,
        et.type_name,
        b.budget_name,
        b.budget_limit,
        b.budget_spent,
        b.start_date,
        b.end_date,
        b.notes
      FROM budgets b
      JOIN Expense_Types et ON b.type_id = et.type_id
      WHERE b.user_id = $1
    `;
    const { rows } = await connection.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    const row = rows[0];
    const budget = {
      id: row.budget_id,
      name: row.budget_name,
      category: row.type_name,
      limit: Number(row.budget_limit),
      spent: Number(row.budget_spent),
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      notes: row.notes
    };

    res.json({ budget });
  } catch (err) {
    console.error("Error fetching budget:", err);
    res.status(500).json({ error: err.message });
  }
}

// Add a new budget
export async function addBudget(req, res) {
  try {
    const { user_id, type_id, budget_limit, budget_name, budget_spent, start_date, end_date, notes } = req.body;
    const budget_id = uuidv4();

    const insertSQL = `
      INSERT INTO budgets (budget_id, user_id, type_id, budget_name, budget_limit, budget_spent, start_date, end_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await connection.query(insertSQL, [budget_id, user_id, type_id, budget_name, budget_limit, 0, start_date, end_date, notes]);

    const notificationThreshold = budget_limit * 0.9;
    if (budget_spent >= notificationThreshold) {
      const notification_id = uuidv4();
      const notification_type = budget_spent >= budget_limit ? 'warning' : 'info';
      const message = budget_spent >= budget_limit 
        ? `Budget "${budget_name}" has exceeded the limit of ${budget_limit}.`
        : `Budget "${budget_name}" has reached 90% of the limit (${budget_limit}).`;

      const notificationSQL = `
        INSERT INTO Notifications (notification_id, user_id, budget_id, message, notification_type, is_read, notified_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
      await connection.query(notificationSQL, [notification_id, user_id, budget_id, message, notification_type, false]);
    }

    const fetchSQL = `
      SELECT 
        b.budget_id,
        b.user_id,
        b.type_id,
        et.type_name,
        b.budget_name,
        b.budget_limit,
        b.budget_spent,
        b.start_date,
        b.end_date,
        b.notes
      FROM budgets b
      JOIN Expense_Types et ON b.type_id = et.type_id
      WHERE b.user_id = $1
    `;
    const { rows } = await connection.query(fetchSQL, [user_id]);
    const row = rows[0];

    const budget = {
      id: row.budget_id,
      name: row.budget_name,
      category: row.type_name,
      limit: Number(row.budget_limit),
      spent: Number(row.budget_spent),
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      notes: row.notes
    };

    res.status(201).json({ message: "Budget added successfully", budget });
  } catch (err) {
    console.error("Error adding budget:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get unread notifications
export async function getUnreadNotifications(req, res) {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const fetchSQL = `
      SELECT 
        n.notification_id,
        n.user_id,
        n.budget_id,
        n.message,
        n.notification_type,
        n.is_read,
        n.notified_at,
        b.budget_name
      FROM Notifications n
      LEFT JOIN budgets b ON n.budget_id = b.budget_id
      WHERE n.user_id = $1 AND n.is_read = FALSE
      ORDER BY n.notified_at DESC
    `;
    const { rows } = await connection.query(fetchSQL, [user_id]);

    const notifications = rows.map(row => ({
      id: row.notification_id,
      userId: row.user_id,
      budgetId: row.budget_id,
      budgetName: row.budget_name || null,
      message: row.message,
      type: row.notification_type,
      isRead: row.is_read,
      notifiedAt: new Date(row.notified_at)
    }));

    res.status(200).json({
      message: "Unread notifications retrieved successfully",
      notifications
    });
  } catch (err) {
    console.error("Error fetching unread notifications:", err);
    res.status(500).json({ error: err.message });
  }
}

// Update an existing budget
export async function updateBudget(req, res) {
  try {
    const { id } = req.params;
    const { user_id, type_id, budget_name, budget_limit, start_date, end_date, notes } = req.body;

    const updateSQL = `
      UPDATE budgets
      SET user_id = $1, type_id = $2, budget_name = $3, budget_limit = $4, start_date = $5, end_date = $6, notes = $7
      WHERE budget_id = $8
    `;
    const result = await connection.query(updateSQL, [
      user_id,
      type_id,
      budget_name,
      budget_limit,
      start_date,
      end_date,
      notes,
      id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    const fetchSQL = `
      SELECT 
        b.budget_id,
        b.user_id,
        b.type_id,
        et.type_name,
        b.budget_name,
        b.budget_limit,
        b.budget_spent,
        b.start_date,
        b.end_date,
        b.notes
      FROM budgets b
      JOIN Expense_Types et ON b.type_id = et.type_id
      WHERE b.budget_id = $1
    `;
    const { rows } = await connection.query(fetchSQL, [id]);
    const row = rows[0];

    const budget = {
      id: row.budget_id,
      name: row.budget_name,
      category: row.type_name,
      limit: Number(row.budget_limit),
      spent: Number(row.budget_spent),
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      notes: row.notes || ""
    };

    res.json({ message: "Budget updated successfully", budget });
  } catch (err) {
    console.error("Error updating budget:", err);
    res.status(500).json({ error: err.message });
  }
}

// Mark notification as read
export async function markNotificationAsRead(req, res) {
  try {
    const { notification_id, user_id } = req.body;

    if (!notification_id || !user_id) {
      return res.status(400).json({ error: "notification_id and user_id are required" });
    }

    const updateSQL = `
      UPDATE Notifications 
      SET is_read = TRUE
      WHERE notification_id = $1 AND user_id = $2
    `;
    const result = await connection.query(updateSQL, [notification_id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Notification not found or user not authorized" });
    }

    res.status(200).json({ message: "Notification marked as read successfully" });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get recent notifications
export async function getRecentNotifications(req, res) {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const fetchSQL = `
      SELECT 
        n.notification_id,
        n.user_id,
        n.budget_id,
        n.message,
        n.notification_type,
        n.is_read,
        n.notified_at,
        b.budget_name
      FROM Notifications n
      LEFT JOIN budgets b ON n.budget_id = b.budget_id
      WHERE n.user_id = $1
      ORDER BY n.notified_at DESC
      LIMIT 5
    `;
    const { rows } = await connection.query(fetchSQL, [user_id]);

    const notifications = rows.map(row => ({
      id: row.notification_id,
      userId: row.user_id,
      budgetId: row.budget_id,
      budgetName: row.budget_name || null,
      message: row.message,
      type: row.notification_type,
      isRead: row.is_read,
      notifiedAt: new Date(row.notified_at)
    }));

    res.status(200).json({
      message: "Recent notifications retrieved successfully",
      notifications
    });
  } catch (err) {
    console.error("Error fetching recent notifications:", err);
    res.status(500).json({ error: err.message });
  }
}

// Delete budget by ID
export async function deleteBudgetById(req, res) {
  try {
    const { id } = req.params;

    const deleteSQL = `
      DELETE FROM budgets
      WHERE budget_id = $1
    `;

    const result = await connection.query(deleteSQL, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.json({ message: "Budget deleted successfully" });
  } catch (err) {
    console.error("Error deleting budget:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get budget summary by category
export async function getBudgetSummaryByCategory(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT 
        et.type_id,
        et.type_name,
        SUM(b.budget_limit) as total_limit,
        SUM(b.budget_spent) as total_spent
      FROM budgets b
      JOIN Expense_Types et ON b.type_id = et.type_id
      WHERE b.user_id = $1
      GROUP BY et.type_id, et.type_name
    `;
    const { rows } = await connection.query(sql, [userid]);

    const summary = rows.map(row => ({
      name: row.type_name,
      typeId: row.type_id,
      total: Number(row.total_limit),
      spent: Number(row.total_spent)
    }));

    res.json(summary);
  } catch (err) {
    console.error("Error fetching budget summary:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get total budget
export async function getTotalBudget(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
        SELECT 
          SUM(budget_limit) as current_month_budget,
          (SELECT SUM(budget_limit) 
           FROM Budgets 
           WHERE user_id = $1 
           AND TO_CHAR(start_date, 'YYYY-MM') = TO_CHAR(CURRENT_TIMESTAMP - INTERVAL '1 month', 'YYYY-MM')) as last_month_budget
        FROM Budgets
        WHERE user_id = $2
        AND TO_CHAR(start_date, 'YYYY-MM') = TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM')
      `;
      const { rows } = await connection.query(sql, [userid, userid]);

    const current = Number(rows[0].current_month_budget || 0);
    const last = Number(rows[0].last_month_budget || 0);
    const trendValue = last > 0 ? ((current - last) / last * 100) : (current > 0 ? 100 : 0);
    
    res.json({
      totalBudget: current,
      trend: {
        value: Math.abs(trendValue).toFixed(1),
        isPositive: current >= last,
      }
    });
  } catch (err) {
    console.error("Error fetching total budget:", err);
    res.status(500).json({ error: err.message });
  }
}

// Get remaining budget
export async function getRemainingBudget(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT 
        (SELECT SUM(budget_limit) - SUM(budget_spent)
         FROM budgets 
         WHERE user_id = $1
         AND TO_CHAR(start_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')) AS current_remaining,
        
        (SELECT SUM(budget_limit) - SUM(budget_spent)
         FROM budgets 
         WHERE user_id = $2
         AND TO_CHAR(start_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM')) AS last_remaining
    `;
    const { rows } = await connection.query(sql, [userid, userid]);

    const currentRemaining = Number(rows[0].current_remaining || 0);
    const lastRemaining = Number(rows[0].last_remaining || 0);

    const trendValue = lastRemaining > 0
      ? ((currentRemaining - lastRemaining) / lastRemaining * 100)
      : (currentRemaining > 0 ? 100 : 0);

    res.json({
      remainingBudget: Math.max(0, currentRemaining),
      trend: {
        value: Math.abs(trendValue).toFixed(1),
        isPositive: currentRemaining >= lastRemaining,
      }
    });
  } catch (err) {
    console.error("Error fetching remaining budget:", err);
    res.status(500).json({ error: err.message });
  }
}
