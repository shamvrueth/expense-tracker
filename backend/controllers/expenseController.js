import { v4 as uuidv4 } from 'uuid';
import connection from '../db.js';

export async function getAllExpenses(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT 
        e.expense_id,
        e.expense_date,
        e.amount,
        e.description,
        e.notes,
        e.budget_id,
        et.type_name
      FROM "expenses" e
      JOIN "expense_types" et ON e.type_id = et.type_id
      WHERE e.user_id = $1
    `;

    const { rows } = await connection.query(sql, [userid]);

    const expenses = rows.map(row => ({
      id: row.expense_id,
      date: new Date(row.expense_date),
      category: row.type_name,
      description: row.description || "",
      amount: Number(row.amount),
      notes: row.notes || "",
      budget_id: row.budget_id || null
    }));

    res.json(expenses);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ error: err.message });
  } finally {}
}

export async function getAllBudgetNames(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT budget_id, budget_name, start_date, end_date
      FROM "budgets"
      WHERE user_id = $1
    `;

    const { rows } = await connection.query(sql, [userid]);

    const budgets = rows.map(row => ({
      budget_id: row.budget_id,
      budget_name: row.budget_name,
    }));

    return res.json(budgets);
  } catch (err) {
    console.error("Error fetching budget names:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getExpenseById(req, res) {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        e.expense_id,
        e.expense_date,
        e.amount,
        e.description,
        e.notes,
        e.budget_id,
        et.type_name
      FROM "expenses" e
      JOIN "expense_types" et ON e.type_id = et.type_id
      WHERE e.expense_id = $1
    `;

    const { rows } = await connection.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const row = rows[0];

    const expense = {
      id: row.expense_id,
      date: new Date(row.expense_date),
      category: row.type_name,
      description: row.description || "",
      amount: Number(row.amount),
      notes: row.notes || "",
      budgetId: row.budget_id || null
    };

    res.json({ expense });
  } catch (err) {
    console.error("Error fetching expense:", err);
    res.status(500).json({ error: err.message });
  } finally {}
}

export async function addExpense(req, res) {
  try {
    const { user_id, type_id, amount, expense_date, notes, description, budget_id } = req.body;
    const expense_id = uuidv4();

    const insertSQL = `
      INSERT INTO "expenses" (expense_id, user_id, description, type_id, amount, expense_date, notes, budget_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await connection.query(insertSQL, [
      expense_id,
      user_id,
      description,
      type_id,
      amount,
      expense_date,
      notes,
      budget_id,
    ]);

    if (budget_id) {
      const budgetUpdateSQL = `SELECT COALESCE(SUM(amount), 0) AS total_spent FROM "expenses" WHERE budget_id = $1`;
      const { rows: budgetRows } = await connection.query(budgetUpdateSQL, [budget_id]);
      const totalSpent = budgetRows[0]?.total_spent || 0;

      const updateBudgetSQL = `
        UPDATE "budgets"
        SET budget_spent = $1
        WHERE budget_id = $2
      `;
      await connection.query(updateBudgetSQL, [totalSpent, budget_id]);

      const budgetSQL = `SELECT budget_name, budget_limit, budget_spent FROM "budgets" WHERE budget_id = $1`;
      const { rows: SelectbudgetRows } = await connection.query(budgetSQL, [budget_id]);
      const budget_name = SelectbudgetRows[0]?.budget_name || "";
      const budget_limit = parseFloat(SelectbudgetRows[0]?.budget_limit) || 0;
      const budget_spent = parseFloat(SelectbudgetRows[0]?.budget_spent) || 0;

      const notificationThreshold = budget_limit * 0.9;
      if (budget_spent >= notificationThreshold) {
        const notification_id = uuidv4();
        const notification_type = budget_spent >= budget_limit ? 'warning' : 'info';
        const message = budget_spent >= budget_limit
          ? `Budget "${budget_name}" has exceeded the limit of ${budget_limit}.`
          : `Budget "${budget_name}" has reached 90% of the limit (${budget_limit}).`;

        const notificationSQL = `
          INSERT INTO "Notifications" (notification_id, user_id, budget_id, message, notification_type, is_read, notified_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `;
        await connection.query(notificationSQL, [notification_id, user_id, budget_id, message, notification_type, false]);
      }
    }

    const fetchSQL = `
      SELECT 
        e.expense_id,
        e.expense_date,
        e.description,
        e.amount,
        e.notes,
        e.budget_id,
        et.type_name
      FROM "expenses" e
      JOIN "expense_types" et ON e.type_id = et.type_id
      WHERE e.expense_id = $1
    `;
    const { rows } = await connection.query(fetchSQL, [expense_id]);

    const row = rows[0];
    const expense = {
      id: row.expense_id,
      date: new Date(row.expense_date),
      description: row.description,
      category: row.type_name,
      description: row.notes || "",
      amount: Number(row.amount),
      notes: row.notes || "",
      budget_id: row.budget_id || null
    };

    return res.status(201).json({ message: "Expense added successfully", expense });
  } catch (err) {
    console.error("Error adding expense:", err);
    return res.status(500).json({ error: err.message });
  } finally {}
}

export async function updateExpense(req, res) {
  try {
    const { id } = req.params;
    const { type_id, description, amount, expense_date, notes, budget_id } = req.body;

    const checkSQL = `SELECT * FROM "expenses" WHERE expense_id = $1`;
    const { rows: checkRows } = await connection.query(checkSQL, [id]);
    if (checkRows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const previousBudgetId = checkRows[0].budget_id;
    const user_id = checkRows[0].user_id;

    const updateSQL = `
      UPDATE "expenses"
      SET type_id = $1, amount = $2, expense_date = $3, notes = $4, description = $5, budget_id = $6
      WHERE expense_id = $7
    `;
    const result = await connection.query(updateSQL, [
      type_id,
      amount,
      expense_date,
      notes,
      description,
      budget_id,
      id,
    ]);

    if (budget_id) {
      const budgetUpdateSQL = `SELECT COALESCE(SUM(amount), 0) AS total_spent FROM "expenses" WHERE budget_id = $1`;
      const { rows: budgetRows } = await connection.query(budgetUpdateSQL, [budget_id]);
      const totalSpent = budgetRows[0]?.total_spent || 0;

      const updateBudgetSQL = `
        UPDATE "budgets"
        SET budget_spent = $1
        WHERE budget_id = $2
      `;
      await connection.query(updateBudgetSQL, [totalSpent, budget_id]);

      const budgetSQL = `SELECT budget_name, budget_limit, budget_spent FROM "budgets" WHERE budget_id = $1`;
      const { rows: SelectbudgetRows } = await connection.query(budgetSQL, [budget_id]);
      const budget_name = SelectbudgetRows[0]?.budget_name || "";
      const budget_limit = parseFloat(SelectbudgetRows[0]?.budget_limit) || 0;
      const budget_spent = parseFloat(SelectbudgetRows[0]?.budget_spent) || 0;

      const notificationThreshold = budget_limit * 0.9;
      if (budget_spent >= notificationThreshold) {
        const notification_id = uuidv4();
        const notification_type = budget_spent >= budget_limit ? 'warning' : 'info';
        const message = budget_spent >= budget_limit
          ? `Budget "${budget_name}" has exceeded the limit of ${budget_limit}.`
          : `Budget "${budget_name}" has reached 90% of the limit (${budget_limit}).`;
        const notificationSQL = `
          INSERT INTO "Notifications" (notification_id, user_id, budget_id, message, notification_type, is_read, notified_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `;
        await connection.query(notificationSQL, [notification_id, user_id, budget_id, message, notification_type, false]);
      }
    }

    if (previousBudgetId && previousBudgetId !== budget_id) {
      const previousBudgetUpdateSQL = `SELECT COALESCE(SUM(amount), 0) AS total_spent FROM "expenses" WHERE budget_id = $1`;
      const { rows: previousBudgetRows } = await connection.query(previousBudgetUpdateSQL, [previousBudgetId]);
      const previousTotalSpent = previousBudgetRows[0]?.total_spent || 0;

      const updatePreviousBudgetSQL = `
        UPDATE "budgets"
        SET budget_spent = $1
        WHERE budget_id = $2
      `;
      await connection.query(updatePreviousBudgetSQL, [previousTotalSpent, previousBudgetId]);
    }

    const fetchSQL = `
      SELECT 
        e.expense_id,
        e.expense_date,
        e.description,
        e.amount,
        e.notes,
        e.budget_id,
        et.type_name
      FROM "expenses" e
      JOIN "expense_types" et ON e.type_id = et.type_id
      WHERE e.expense_id = $1
    `;
    const { rows } = await connection.query(fetchSQL, [id]);

    const row = rows[0];
    const expense = {
      id: row.expense_id,
      date: new Date(row.expense_date),
      category: row.type_name,
      description: row.description,
      description: row.notes || "",
      amount: Number(row.amount),
      notes: row.notes || "",
      budget_id: row.budget_id || null
    };

    res.json({ message: "Expense updated successfully", expense });
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({ error: err.message });
  } finally {}
}

// In expenseController.js
export async function deleteExpenseById(req, res) {
  try {
    const { id } = req.params;

    const sql = `DELETE FROM "expenses" WHERE expense_id = $1 RETURNING *`;
    const { rows } = await connection.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ error: err.message });
  }
}

// In expenseController.js
export async function getExpenseCategories(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT 
        et.type_name AS name,
        COALESCE(SUM(e.amount), 0) AS value
      FROM expense_types et
      LEFT JOIN expenses e 
        ON e.type_id = et.type_id
        AND e.user_id = $1
      GROUP BY et.type_name
      ORDER BY et.type_name ASC
    `;

    const { rows } = await connection.query(sql, [userid]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expense categories:", err);
    res.status(500).json({ error: err.message });
  }
}


// In expenseController.js
export async function getMonthlyExpenses(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT 
        TO_CHAR(e.expense_date, 'YYYY-MM') AS month,
        SUM(e.amount) AS total_expenses
      FROM "expenses" e
      WHERE e.user_id = $1
      GROUP BY TO_CHAR(e.expense_date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    const { rows } = await connection.query(sql, [userid]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching monthly expenses:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getRecentExpenses(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT 
        e.expense_id,
        e.expense_date,
        e.amount,
        e.description,
        et.type_name
      FROM "expenses" e
      JOIN "expense_types" et ON e.type_id = et.type_id
      WHERE e.user_id = $1
      ORDER BY e.expense_date DESC
      LIMIT 5
    `;

    const { rows } = await connection.query(sql, [userid]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching recent expenses:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getTotalExpenses(req, res) {
  try {
    const { userid } = req.params;

    const sql = `
      SELECT 
        COALESCE(SUM(CASE 
          WHEN DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE) 
          THEN amount END), 0) AS current_month,
        COALESCE(SUM(CASE 
          WHEN DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
          THEN amount END), 0) AS last_month
      FROM "expenses"
      WHERE user_id = $1
    `;

    console.log("🔍 Executing getTotalExpenses query for user:", userid);

    const { rows } = await connection.query(sql, [userid]);
    console.log("✅ Query result:", rows);

    const current = parseFloat(rows[0]?.current_month ?? 0);
    const last = parseFloat(rows[0]?.last_month ?? 0);
    const diff = current - last;
    const trendPercent = last > 0 ? (diff / last) * 100 : 0;

    res.json({
      totalExpenses: {
        value: Number(current.toFixed(2)),
        trend: {
          value: Math.abs(Number(trendPercent.toFixed(2))),
          isPositive: diff <= 0,
        },
      },
    });
  } catch (err) {
    console.error("❌ Error fetching total expenses:", err);
    res.status(500).json({ error: err.message });
  }
}
