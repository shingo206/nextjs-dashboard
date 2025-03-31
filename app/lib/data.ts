import postgres from 'postgres';
import {CustomerField, CustomersTableType, InvoiceForm, InvoicesTable, LatestInvoiceRaw, Revenue,} from './definitions';
import {formatCurrency} from './utils';

const sql = postgres(process.env.POSTGRES_URL!, {ssl: 'require'});

export const fetchRevenue = async () => {
    try {
        // Artificially delay a response for demo purposes.
        // Don't do this in production :)

        // console.log('Fetching revenue data...');
        // await new Promise((resolve) => setTimeout(resolve, 3000));

        // console.log('Data fetch completed after 3 seconds.');

        return await sql<Revenue[]>`SELECT *
                                    FROM revenue`;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch revenue data.');
    }
};

export const fetchLatestInvoices = async () => {
    try {
        const data = await sql<LatestInvoiceRaw[]>`
            SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
            FROM invoices
                     JOIN customers ON invoices.customer_id = customers.id
            ORDER BY invoices.date DESC LIMIT 5`;

        return data.map((invoice) => ({
            ...invoice,
            amount: formatCurrency(invoice.amount),
        }));
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch the latest invoices.');
    }
};

export const fetchCardData = async () => {
    try {
        const invoiceCountPromise = sql`SELECT COUNT(*)
                                        FROM invoices`;
        const customerCountPromise = sql`SELECT COUNT(*)
                                         FROM customers`;
        const invoiceStatusPromise = sql`SELECT SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)    AS "paid",
                                                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
                                         FROM invoices`;

        const [
            invoiceCountResult,
            customerCountResult,
            invoiceStatusResult
        ] = await Promise.all([
            invoiceCountPromise,
            customerCountPromise,
            invoiceStatusPromise,
        ]);
        console.log(invoiceCountResult);
        console.log(customerCountResult);
        console.log(invoiceStatusResult);

        const numberOfInvoices = Number(invoiceCountResult[0].count ?? '0');
        const numberOfCustomers = Number(customerCountResult[0].count ?? '0');
        const totalPaidInvoices = formatCurrency(invoiceStatusResult[0].paid ?? '0');
        const totalPendingInvoices = formatCurrency(invoiceStatusResult[0].pending ?? '0');

        return {
            numberOfCustomers,
            numberOfInvoices,
            totalPaidInvoices,
            totalPendingInvoices,
        };
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch card data.');
    }
};

const ITEMS_PER_PAGE = 6;
export const fetchFilteredInvoices = async (
    query: string,
    currentPage: number,
) => {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    try {
        return await sql<InvoicesTable[]>`
            SELECT invoices.id,
                   invoices.amount,
                   invoices.date,
                   invoices.status,
                   customers.name,
                   customers.email,
                   customers.image_url
            FROM invoices
                     JOIN customers ON invoices.customer_id = customers.id
            WHERE customers.name ILIKE ${`%${query}%`}
               OR
                customers.email ILIKE ${`%${query}%`}
               OR
                invoices.amount::text ILIKE ${`%${query}%`}
               OR
                invoices.date::text ILIKE ${`%${query}%`}
               OR
                invoices.status ILIKE ${`%${query}%`}
            ORDER BY invoices.date DESC
                LIMIT ${ITEMS_PER_PAGE}
            OFFSET ${offset}
        `;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch invoices.');
    }
};

export const fetchInvoicesPages = async (query: string) => {
    try {
        const data = await sql`SELECT COUNT(*)
                               FROM invoices
                                        JOIN customers ON invoices.customer_id = customers.id
                               WHERE customers.name ILIKE ${`%${query}%`}
                                  OR
                                   customers.email ILIKE ${`%${query}%`}
                                  OR
                                   invoices.amount::text ILIKE ${`%${query}%`}
                                  OR
                                   invoices.date::text ILIKE ${`%${query}%`}
                                  OR
                                   invoices.status ILIKE ${`%${query}%`}
        `;

        return Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch total number of invoices.');
    }
};

export const fetchInvoiceById = async (id: string) => {
    try {
        const data = await sql<InvoiceForm[]>`
            SELECT invoices.id,
                   invoices.customer_id,
                   invoices.amount,
                   invoices.status
            FROM invoices
            WHERE invoices.id = ${id};
        `;

        const invoice = data.map((invoice) => ({
            ...invoice,
            // Convert amount from cents to dollars
            amount: invoice.amount / 100,
        }));

        return invoice[0];
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch invoice.');
    }
};

export const fetchCustomers = async () => {
    try {
        return await sql<CustomerField[]>`
            SELECT id,
                   name
            FROM customers
            ORDER BY name ASC
        `;
    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Failed to fetch all customers.');
    }
};

export const fetchFilteredCustomers = async (query: string) => {
    try {
        const data = await sql<CustomersTableType[]>`
            SELECT customers.id,
                   customers.name,
                   customers.email,
                   customers.image_url,
                   COUNT(invoices.id)                                                         AS total_invoices,
                   SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
                   SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END)    AS total_paid
            FROM customers
                     LEFT JOIN invoices ON customers.id = invoices.customer_id
            WHERE customers.name ILIKE ${`%${query}%`}
               OR
                customers.email ILIKE ${`%${query}%`}
            GROUP BY customers.id, customers.name, customers.email, customers.image_url
            ORDER BY customers.name ASC
        `;

        return data.map((customer) => ({
            ...customer,
            total_pending: formatCurrency(customer.total_pending),
            total_paid: formatCurrency(customer.total_paid),
        }));
    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Failed to fetch customer table.');
    }
};
