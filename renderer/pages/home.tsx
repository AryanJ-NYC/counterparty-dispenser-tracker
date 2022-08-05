import React, { PropsWithChildren, useCallback } from 'react';
import Head from 'next/head';
import { useDispenserAddresses } from '../modules/lib/stores/dispenserAddresses';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { validate } from 'bitcoin-address-validation';
import { useQuery } from '@tanstack/react-query';
import { Counterparty } from '../modules/lib/Counterparty';
import { shell } from 'electron';

const cp = new Counterparty();

function Home() {
  const [dispenserAddresses, setDispenserAddresses] = useDispenserAddresses();
  const deleteAddress = useCallback(
    (dispenserAddress: string) => {
      const newAddresses = dispenserAddresses.filter((disp) => disp !== dispenserAddress);
      setDispenserAddresses(newAddresses);
    },
    [dispenserAddresses, setDispenserAddresses]
  );

  return (
    <>
      <Head>
        <title>Dispenser Tracker</title>
      </Head>
      <div className="flex flex-col gap-y-32 p-8">
        {!!dispenserAddresses.length && (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-x-8 gap-y-16">
            {dispenserAddresses.map((d) => {
              return <Address dispenserAddress={d} key={d} onDeleteClick={deleteAddress} />;
            })}
          </div>
        )}
        <div>
          Enter a dispenser address:
          <Formik
            initialValues={{ dispenserAddress: '' }}
            onSubmit={({ dispenserAddress }, { resetForm, setFieldError }) => {
              if (dispenserAddresses.includes(dispenserAddress)) {
                return setFieldError(
                  'dispenserAddress',
                  'Address already in your list of dispensers'
                );
              }

              if (!validate(dispenserAddress)) {
                return setFieldError('dispenserAddress', 'Address is not a valid Bitcoin address');
              }
              setDispenserAddresses([...dispenserAddresses, dispenserAddress]);
              resetForm();
            }}
          >
            <Form className="flex flex-col gap-y-2">
              <Field
                className="border border-gray-700 p-2 rounded-sm w-96"
                name="dispenserAddress"
              />
              <ErrorMessage component={CustomError} name="dispenserAddress" />
              <button className="bg-purple-500 text-purple-100 p-4 rounded-md" type="submit">
                Add Address
              </button>
            </Form>
          </Formik>
        </div>
      </div>
    </>
  );
}

const CustomError: React.FC<PropsWithChildren<unknown>> = ({ children }) => {
  return <span className="block text-xs text-red-800 my-0">{children}</span>;
};

const Address: React.FC<{
  dispenserAddress: string;
  onDeleteClick: (d: string) => void;
}> = ({ dispenserAddress, onDeleteClick }) => {
  console.log('re-render');
  const { data: balance } = useQuery(
    ['balance', dispenserAddress],
    async () => {
      const resp = await fetch(`https://mempool.space/api/address/${dispenserAddress}/utxo`);
      const json: { value: number }[] = await resp.json();
      return json.reduce((acc, utxo) => acc + utxo.value, 0);
    },
    {
      cacheTime: 30 * 60 * 1_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      // @ts-expect-error
      staleTime: `Infinity`,
    }
  );

  const { data: dispensers } = useQuery(['dispenser', dispenserAddress], ({ queryKey }) => {
    const [_, dispenserAddress] = queryKey;
    if (dispenserAddress) {
      return cp.getDispenserByAddresses([dispenserAddress]);
    }
  });

  return (
    <div className="flex flex-col">
      <div className="flex gap-x-8">
        <div>
          <p>{dispenserAddress}</p>
          {typeof balance === 'number' && <p>Balance: {balance.toLocaleString()} sats</p>}
        </div>
        <button onClick={() => onDeleteClick(dispenserAddress)} type="button">
          Delete
        </button>
      </div>
      {dispensers?.length ? (
        dispensers.map((d) => (
          <div
            className="odd:bg-green-400 even:bg-green-100 flex flex-col gap-y-1 p-2"
            key={d.tx_hash}
          >
            <button
              className="text-left break-all"
              onClick={() => shell.openExternal(`https://xchain.io/tx/${d.tx_hash}`)}
            >
              Dispenser: {d.tx_hash}
            </button>
            <p>Asset: {d.asset}</p>
            <p>Escrowed: {d.escrow_quantity.toLocaleString()}</p>
            <p>Remaining: {d.give_remaining.toLocaleString()}</p>
            <p>Rate: {d.satoshirate.toLocaleString()} sats</p>
            <p>Status: {d.status === 10 ? 'closed' : 'open'}</p>
          </div>
        ))
      ) : (
        <p>No Dispensers</p>
      )}
    </div>
  );
};

export default Home;
