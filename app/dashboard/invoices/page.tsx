import {fetchInvoicesPages} from "@/app/lib/data";
import {lusitana} from '@/app/ui/fonts';
import {CreateInvoice} from '@/app/ui/invoices/buttons';
import Pagination from "@/app/ui/invoices/pagination";
import Table from "@/app/ui/invoices/table";
import {InvoicesTableSkeleton} from "@/app/ui/skeletons";
import Search from '@/app/ui/search';
import {Suspense} from "react";

type Props = {
    searchParams?: Promise<{ query?: string; page?: string; }>;
};

const Page = async (props: Props) => {
    const searchParams = await props.searchParams;
    const query = searchParams?.query || '';
    const currentPage = Number(searchParams?.page) || 1;
    const totalPages = await fetchInvoicesPages(query);

    return (
        <div className={'w-full'}>
            <div className='flex w-full place-content-center'>
                <h1 className={`${lusitana.className} text-2xl`}>Invoices</h1>
            </div>
            <div className={`mt-4 flex place-content-center gap-2 md:mt-8`}>
                <Search placeholder={'Search Invoices...'}/>
                <CreateInvoice/>
            </div>
            <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton/>}>
                <Table query={query} currentPage={currentPage}/>
            </Suspense>
            <div className={`mt-5 flex w-full justify-center`}>
                <Pagination totalPages={totalPages}/>
            </div>
        </div>
    );
};
export default Page;
